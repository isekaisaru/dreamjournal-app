# 設計書（ADR）: 音声アップロード再送時の Dream 重複作成の防止（Idempotency）

| 項目 | 内容 |
|---|---|
| ステータス | **Proposed（提案・未決定）** — 人間の判断待ち。本書は docs のみで、コード・migration・設定は一切変更しない |
| 作成日 | 2026-10-25 |
| 対象 | `POST /api/analyze_audio_dream`（Next.js 中継）→ `POST /analyze_audio_dream`（Rails `AudioDreamsController#create`） |
| きっかけ | PR #542（音声送信失敗時に録音を保持し再送可能にする）のレビューで指摘された「再送で Dream が二重作成される」リスク |
| 調査基準 | `origin/main` @ `af90ba71`。**#542 は未マージ**のため、フロントの行番号は main 時点（#542 適用後はずれる） |

## 0. 読み方（事実と推測の区別）

本書では記述の確からしさを次のタグで区別する。

- **【事実】** リポジトリのコードで確認した内容。`ファイル:行` を併記する。
- **【推測】** コードから妥当に推定したが、本番環境や実測では確認していない内容。
- **【未確認】** 確認できていない、または人間が確かめる必要がある内容（§8 に集約）。

本書はコードを実行しておらず、DB・本番 URL・Render/Vercel の設定画面にも触れていない。本番の挙動に関する記述は、すべて【推測】または【未確認】である。

---

## 1. 問題と影響

### 1.1 問題の要約

フロントの Next.js 中継は、Rails へのリクエストを約 15 秒で打ち切って 504 を返す。しかし Rails 側は、打ち切られた後も処理を続けて Dream を保存し、解析ジョブ（Whisper + GPT）を投入している可能性がある。利用者が「失敗した」と見て再送すると、同じ録音から 2 件目の Dream が作られ、OpenAI が二重に課金される。

PR #542 は「録音をメモリに保持して再送できる」ようにしたため、この再送が簡単になる。#542 は UI の注意書きで緩和するだけで、サーバー側の防止策は持たない（#542 の PR 本文に「重複防止は API 契約変更を伴うためスコープ外」と明記されている）。

### 1.2 再現シナリオ

**S1: プロキシのタイムアウト（主シナリオ）**

1. 利用者が録音を止める。`handleBlobReady` が `uploadAndAnalyzeAudio(blob)` を呼ぶ。
2. Next.js 中継が Rails へ `fetch` する。Render のコールドスタートや回線の遅さで 15 秒を超える。中継が `AbortController.abort()` し、504 を返す。
3. Rails がリクエストを受け取っていた場合、`dream.save`、`trial_audio_count` の加算、`AnalyzeDreamJob.perform_later` まで完了する。この時点で Dream #1 が存在し、Whisper + GPT が走る。
4. ブラウザには 504 が返る。利用者は「もう一度送信」（#542）を押す。
5. Dream #2 が作られ、Whisper + GPT がもう一度走る。

**S2: レスポンスの喪失**

Rails が 200 を返したが、モバイル回線の切断などでブラウザに届かない。`fetch` が `TypeError`（Failed to fetch / Load failed）で失敗する。S1 と同じ結果になる。

**S3: 保存後の例外**

`dream.save` 成功後に `increment!` や `perform_later` が例外を出すと、`rescue StandardError` が 500 を返す。Dream は保存済みなので、再送すると重複する。

**S4: 二重タップ**

#542 の `isSubmittingRef`（クライアント側）が防ぐ。サーバー側の防止策ではない。本書の対象はクライアントのガードをすり抜ける S1〜S3 である。

### 1.3 コード上の根拠

| # | 事実 | 根拠 |
|---|---|---|
| F1 | 中継は Rails 呼び出しを 15 秒で中止し、`AbortError` なら 504 を返す | `frontend/app/api/analyze_audio_dream/route.ts:53-55`（`TIMEOUT_MS = 15_000`、`setTimeout(() => controller.abort())`）、`:70-79`（504） |
| F2 | 中継は `file` だけを Rails に転送し、キーなどの識別子は渡さない | `route.ts:44-49`（`relayFormData.append("file", ...)`）、`:62-66`（Cookie と Origin/Referer のみ） |
| F3 | ブラウザ側はファイル名に `Date.now()` を使い、リクエストごとに新しい `FormData` を作る。リクエストを識別する情報はない | `frontend/lib/audioAnalysis.ts:6,20-25` |
| F4 | 失敗時、`handleBlobReady` は `toast.error` を出して `isProcessing` を戻すだけ（main 時点では Blob も破棄される。#542 で保持に変わる） | `frontend/app/components/DreamEntryLauncher.tsx:67-94` |
| F5 | Rails は Dream を `new` → `audio.attach` → `save` →（trial なら）`increment!` → `perform_later` → 200 の順で処理する。既存 Dream の探索はなく、毎回新規作成する | `backend/app/controllers/audio_dreams_controller.rb:18-44` |
| F6 | Dream の保存・加算・ジョブ投入のいずれかが例外を出すと一括して 500 を返す（保存済みでも 500 になりうる） | `audio_dreams_controller.rb:48-51` |
| F7 | `dreams` に重複を防ぐ一意制約はない。あるのは `user_id`、`analysis_status`、`dream_profile_id` などの非一意 index のみ | `backend/db/structure.sql:304-318`（列）、`:962-997`（index） |
| F8 | trial ユーザーの上限は `TRIAL_AUDIO_LIMIT = 1`。上限チェック（`before_action`）は create 本体より前で、加算（`increment!`）は保存後 | `audio_dreams_controller.rb:6,8,34,57-68` |
| F9 | 音声は Whisper + GPT の二重課金と明記されている。ジョブは `AnalyzeDreamJob` で、失敗時 `retry_on StandardError ... attempts: 3`。リトライのたびに Whisper を再呼び出しする | `audio_dreams_controller.rb:4,37`、`backend/app/jobs/analyze_dream_job.rb:5,11-12,26-31` |
| F10 | `AiUsageLog` の `FEATURES` は `dream_analysis / image_generation / monthly_summary` のみ。音声アップロードの経路には `AiUsageLog` の記録も上限チェックもない | `backend/app/models/ai_usage_log.rb:2`、`AiUsageLog` の参照は `dreams_controller.rb:397,404` と `monthly_summaries_controller.rb:19,36` のみ（grep で確認） |
| F11 | 音声アップロードの上限は Rack::Attack の「認証ユーザー 1 時間 5 回」のみ。再送もこの 5 回に数えられる | `backend/config/initializers/rack_attack.rb:72-80` |
| F12 | 本番の Active Storage は `:local`。Active Job の queue adapter は本番では未指定（コメントアウト）。Gemfile にジョブ用の gem はない | `backend/config/environments/production.rb:40,71`、`backend/Gemfile`（`rack-attack` のみ該当） |
| F13 | Puma の `worker_timeout` は本番 90 秒 | `backend/config/puma.rb:30` |
| F14 | `check_trial_audio_limit` は `premium?` なら即 return、trial でなければ return | `audio_dreams_controller.rb:57-60` |

### 1.4 影響

**二重 Dream**【事実: 構造上起こりうる（F5, F7）／頻度は未確認】
同じ録音から「音声記録 YYYY/MM/DD HH:MM」が 2 件でき、片方は解析ジョブが走って中身が入る。利用者は一覧で重複を目にする。

**二重課金（OpenAI）**【事実: 経路は存在する（F5, F9）／金額は未算出】
ジョブが 2 本投入され、Whisper + GPT が 2 回呼ばれる。さらに F9 のとおり、解析失敗時は 1 本のジョブが最大 3 回まで Whisper を呼び直す。これは本件とは別の増幅要因で、本書の範囲外だが、重複防止を入れても残る。

**上限への影響は利用者の種類で異なる**

| 利用者 | 影響 | 根拠 |
|---|---|---|
| 認証済みの通常ユーザー（premium 含む） | **重複作成を止めるものは Rack::Attack の 5 回/時だけ**。再送は 5 回の枠も消費するため、1 時間に最大 4 件までは追加で重複しうる。`AiUsageLog` は音声では使われていない | F10, F11 |
| trial ユーザー | 1 回目の送信が Rails で成功すると `trial_audio_count` が 1 になる（F8）。そのため**再送は 403（`limit_reached`）で弾かれ、二重課金は起きない**。代わりに「Dream は保存されているのに、上限に達しましたと表示される」という分かりにくい結果になる。ブラウザ側のカウントは成功時にしか +1 されないため、表示上の「のこり回数」が実際とずれる（`DreamEntryLauncher.tsx:75-80`） | F4, F8 |
| trial の並行リクエスト | 上限チェックと加算が別操作（ロックなし）なので、同時に 2 本届くと両方が通りうる【推測: ロックがないことはコードで確認、実際に起きるかは未確認】。既存の問題で本書の範囲外 | F8 |

### 1.5 いつ起きるか

起きうる条件（いずれも上記コードから導いた【推測】で、本番での発生頻度は【未確認】）。

- Render のコールドスタートで Rails の応答が遅い。`route.ts:52` のコメントが、この対策として 15 秒の打ち切りを入れたと説明している【事実: コメント】。
- 回線が遅く、アップロードと保存が 15 秒を超える。
- 応答が回線断で失われる（S2）。
- 保存後の例外（S3）。

また「中継が abort したあと、Rails が処理を続けるか」は、Render のプロキシと Puma の挙動に依存する。一般に Puma のアプリスレッドはクライアント切断では中断されない【推測】。**リクエストが Puma に届く前に切断された場合は破棄される可能性もある**【推測】。この境界が本番でどうなっているかは未確認で、読み取り専用の実測案を付録 B に示す。

---

## 2. 現状のフロー図（テキスト）

```
ブラウザ(DreamEntryLauncher)      Next.js 中継(Vercel)                Rails(Render)
─────────────────────────      ─────────────────────────       ──────────────────────────────
録音停止 → Blob
handleBlobReady (L67)
 uploadAndAnalyzeAudio(blob)
  FormData{file, 名前=Date.now()}
  POST /api/analyze_audio_dream ──▶ route.ts POST
                                    ・audio取得/2KB未満=422/型検査
                                    ・relayFormData{file} だけ作成
                                    ・fetch(BACKEND/analyze_audio_dream,
                                       cookie, Origin/Referer,
                                       signal=15s) ───────────────▶ Rack::Attack(5回/時/user)
                                                                     verify_request_origin!
                                                                     authorize_request
                                                                     require_verified_email
                                                                     check_trial_audio_limit ─(上限なら403)
                                                                     Dream.new(音声記録…, pending)
                                                                     audio.attach / dream.save ──▶【Dream #1 COMMIT】
                                                                     trial なら trial_audio_count += 1
                                                                     AnalyzeDreamJob.perform_later
                                                                       (Whisper→GPT。課金)
                                    t=15s AbortError                 ◀── 200 {id,status:"pending"}
                                    ──▶ 504 を返す                       （応答は捨てられる）
 catch: toast.error                ◀──
 (#542: Blob を state に保持)
 「もう一度送信」(#542)
  POST /api/analyze_audio_dream ──▶ （同じ経路を再実行）────────▶ Dream.new … 既存Dreamを探さない
                                                                     ──▶【Dream #2 COMMIT】＋ジョブ再投入
                                                                     （二重Dream・二重課金）
```

要点:

- 「リクエストを識別する情報」が経路のどこにもない（F2, F3）。Rails は 2 回目が再送かどうかを判断できない。
- Dream の COMMIT とジョブ投入は、利用者へのレスポンスより前に終わる。中継のタイムアウトは「応答を待つのをやめる」だけで、サーバー側の処理を取り消さない。

---

## 3. 選択肢の比較

### 3.1 先に整理: CheckoutAttempt との違い

寄付・プレミアム決済には既に冪等性の仕組みがある。流用できる語彙と、流用できない前提を分ける。

- **語彙（流用する）**: `idempotency_key`（`backend/app/models/checkout_attempt.rb:10,12`、DB は `structure.sql:167` の `character varying`）、`status` の状態名、「一意制約違反を `RecordNotUnique` で受けて既存行を返す」型（`checkout_attempt.rb:15-21`）、状態遷移を条件付き `UPDATE` で行い遅れた結果で降格させない型（`:28-55`）、RLS は default deny（`20260923000000_enable_rls_on_checkout_attempts.rb`）。
- **前提の違い**: CheckoutAttempt の `idempotency_key` は**サーバーが生成**し（`checkout_controller.rb:270`）、「同一ユーザー・同一プランで有効な試行は 1 件」という部分一意 index（`20260828000000_create_checkout_attempts.rb:23-27`）で再利用する。クライアントは何も送らない。音声ではこの方式をそのまま使えない。利用者は正当に連続して 2 本録音できるため、「ユーザー単位の有効な試行は 1 件」では**再送と新規録音を区別できない**。区別する情報（キー、または内容そのもの）が必要になる。

### 3.2 案 A: クライアント生成の Idempotency-Key（UUID）＋ `dreams` に一意制約

**概要**
録音（Blob）が確定した時点でブラウザが UUID を作り、`Idempotency-Key` ヘッダーで送る。同じ Blob の再送では同じキーを使う。Next.js 中継はヘッダーを検証して Rails に転送する。Rails は `dreams` に `(user_id, idempotency_key)` の部分一意 index を持ち、同じキーの Dream が既にあれば**新規作成も加算もジョブ投入もせず**、既存 Dream の状態を返す。

**変更範囲**

| 層 | 変更 |
|---|---|
| frontend | `DreamEntryLauncher`: Blob ごとにキーを生成し、#542 の `failedAudio` に Blob と一緒に保持。`audioAnalysis.ts`: 引数にキーを追加しヘッダーに設定 |
| proxy | `route.ts`: ヘッダーを読み、形式を検証して Rails へ転送（`headers` に 1 行追加）。タイムアウト値の見直しは別 PR（§4） |
| backend | `AudioDreamsController`: 再送判定の `before_action`（`check_trial_audio_limit` より前）、`RecordNotUnique` の救済、再送時は加算しない。`Dream`: キー形式の validation |
| DB | `dreams` に nullable 列 1 つ＋部分一意 index 1 つ |

**migration の要否と本番適用の重さ**: 要（1 本）。ただし軽い。

- nullable で DEFAULT なしの列追加は、PostgreSQL ではカタログ更新のみで行を書き換えない（一般的な PostgreSQL の挙動）。
- 部分一意 index（`WHERE idempotency_key IS NOT NULL`）の作成は `dreams` を走査する。件数は【未確認】。小さければ通常の `add_index` で一瞬、大きければ `disable_ddl_transaction!` + `algorithm: :concurrently` にする。
- 既存行はすべて NULL なので、部分 index には 1 行も入らず、既存データの移行・バックフィルは不要。
- 本番適用は既存手順（`RUN_MIGRATIONS=true` でデプロイ、確認後 `false` に戻す。§7）をそのまま使える。`entrypoint.sh:125-133` が `db:migrate` をアプリ起動前に実行する【事実】。

**RLS / structure.sql への影響**

- `structure.sql` の差分は、`dreams` の列 1 行、index 1 行、`schema_migrations` のバージョン 1 行。CI の再生成チェック（`.github/workflows/backend-test.yml:79-135`）が一致を要求する。
- **RLS の変更なし**。新規テーブルを作らないので、RLS migration も CI の `expected_tables`（`backend-test.yml:47-54`）の更新も不要。
- 参考（本件の範囲外）: `structure.sql:1217-1257` で RLS が有効なのは 7 テーブル（`ai_usage_logs / checkout_attempts / dream_image_generations / dream_profiles / payments / processed_webhook_events / user_sessions`）で、`dreams` は含まれない【事実】。意図的かどうかは【未確認】。本設計は `dreams` の RLS 状態を変えない。

**後方互換**: 高い。

- ヘッダーがないリクエストは**今までどおり**（毎回新規作成）。旧フロント（ブラウザにキャッシュされた古い bundle）も動く。
- 列は nullable で、旧コードは列の存在を無視する。コードのロールバックでも壊れない。
- ※デプロイ順の注意: 新コードが列を参照するため、**migration が先に適用されている必要がある**（§7）。

**テスト方針**: §6。RSpec の request spec が中心で、既存の `audio_dreams_spec.rb` に追加しやすい。

**利点**

- 変更が最小（新規テーブル・RLS・cron が不要）。
- 状態を新たに持たない。「処理中 / 完了 / 失敗」は既存の `dreams.analysis_status`（`pending / done / failed`、`dream.rb:14`）がそのまま表す。
- 同時リクエストの競合は DB の一意制約が解決する。PostgreSQL は、未コミットの同一キーの挿入があると後続の挿入をコミットまで待たせ、コミット後に一意違反にする（一般的な挙動）ので、先行リクエストの完了後に再送側が既存 Dream を拾える。
- キーの保持期間が Dream 行の寿命と一致し、TTL や掃除ジョブが要らない。
- `Idempotency-Key` は一般的な HTTP のイディオムで、将来テキストの `POST /dreams` にも流用できる（列名を汎用的な `idempotency_key` にしておく）。

**欠点**

- ブラウザ、中継、Rails の 3 層に手を入れる。
- 中核テーブル `dreams` に、リクエスト層の関心事の列が増える。
- 「Dream が作られる前に失敗した」場合の記録は残らない（残す必要は薄い。キーが消費されず、再送すれば通常どおり作られる）。
- Dream 保存後・ジョブ投入前にプロセスが落ちると、Dream は `pending` のまま残り、再送は「受付済み」を返し続ける。これは**既存リスク**（F5, F12。本番の queue adapter が未指定のため、Rails 既定の in-process 非同期になっている可能性が高い【推測】）で、本案で新たに生じるものではないが、重複防止により再送でも自動では直らなくなる点は明記しておく（§5, §8）。

### 3.3 案 B: 専用テーブル（`AudioUploadAttempt`、CheckoutAttempt 型）で状態管理

**概要**
`audio_upload_attempts` テーブルを作る。列の例: `user_id`、`idempotency_key`、`request_fingerprint`（ファイルサイズ + checksum など）、`status`、`dream_id`（nullable FK）、`error_code`、`expires_at`、timestamps。`(user_id, idempotency_key)` に一意 index、`status` に CHECK 制約。Rails は「試行を作る → Dream を作る → 試行を `accepted` に遷移 → ジョブ投入」の順で処理する。

**状態の語彙（CheckoutAttempt から借用）**

| CheckoutAttempt | AudioUploadAttempt での対応案 |
|---|---|
| `pending` | 受付済み・Dream 未作成 |
| `open` | `accepted`（Dream 作成済み・ジョブ投入済み）に相当 |
| `uncertain` | `pending` のまま一定時間経過（プロセス断など。成否不明） |
| `failed` | Dream 作成前に確定した失敗（検証エラーなど） |
| `completed` / `expired` | 通常は不要（解析の完了は `dreams.analysis_status` が持つ） |

**変更範囲**: frontend / proxy は案 A と同じ。backend は新モデル・状態遷移・TTL の掃除。DB はテーブル 1 つ（＋ FK、index、CHECK）。

**migration の要否と本番適用の重さ**: 要。**案 A より明確に重い**。

- 作成 migration に加えて **RLS 有効化の migration が必要**。`checkout_attempts` では作成（2026-08-28）と RLS（2026-09-23）が別 PR・約 1 か月差で、その間 Supabase Security Advisor の警告が出ていた可能性が高い【推測: 日付からの推定】。同じ PR に RLS も含めるべき。
- `structure.sql` の差分が大きい（`CREATE TABLE`、シーケンス、index、FK、CHECK、`ENABLE ROW LEVEL SECURITY`）。CI の `expected_tables`（`backend-test.yml:47-54`）にテーブル名を追加する必要がある。
- 本番適用は `RUN_MIGRATIONS=true` の同じ手順。ただし 2 本の migration を順に流すことになり、確認項目（テーブル、RLS 状態）が増える。
- TTL の掃除（期限切れ行の削除）を回す仕組みが要る。リポジトリにはジョブ用の gem も cron の定義もない【事実: F12】ため、Render の Cron Job などの追加が必要になる【未確認】。

**後方互換**: 高い（ヘッダーなしは従来どおり）。

**テスト方針**: 案 A の項目に加え、状態遷移（`transition_after_error!` 相当）、`uncertain` からの復帰、TTL 削除、RLS 状態の CI 確認。

**利点**

- 「Dream を作る前の失敗」や「403 などの確定拒否」も含めて、試行の結果を保存できる。応答の再現（replay）が正確になる。
- Dream を削除しても試行の記録が残り、キーの再利用を TTL で制御できる。
- 決済と同じ形で、読む人が迷わない。将来、他の課金系 API にも広げやすい。

**欠点**

- 変更量が最大級（テーブル、モデル、遷移、掃除、RLS、CI 更新）。
- 2 つのテーブル（試行と Dream）の整合性を保つ必要がある。「試行は `accepted` だが Dream がない」といった不整合の経路が増える。
- 今回守りたいのは「同じ Blob の再送で Dream を増やさない」だけで、B の追加機能（拒否結果の保存など）は今の要件にない。

### 3.4 案 C: 非同期化（先にアップロード受付 → job id をポーリング）

**事実の確認**: 解析自体は**既に非同期**。`AudioDreamsController#create` は Dream を保存してジョブを積み、すぐ 200 を返す（`audio_dreams_controller.rb:36-44`）。結果の確認用に `GET /dreams/:id/analysis` と `GET /dreams/statuses` も既にある（`routes.rb:16-23`）。15 秒で詰まるのは、解析ではなく**マルチパートのアップロードと、コールドスタートを含む受付**のほうである。

したがって案 C は次のどちらかになる。

- **C1: 受付枠の先行作成**。小さな JSON リクエストでサーバー生成 ID（`upload_id`）を先にもらい、`PUT /audio_uploads/:id` で音声を上げ、ジョブ投入はサーバー側で 1 回だけ行う。PUT は ID 指定なので自然に冪等になる。ただし、先行作成そのものが再送されうる（空の枠が増えるだけで課金はされない）。ID の状態管理が要り、実質的に案 B のテーブルが必要になる。
- **C2: ストレージへの直接アップロード**（Active Storage の direct upload）。本番の Active Storage が `:local`（`production.rb:40`、`storage.yml` の S3 等はコメントアウト）なので、**外部ストレージの導入が前提**になる。範囲が大きく、現状では現実的でない。

**変更範囲**: 全層に及ぶ。フロントは 2〜3 段階の通信とポーリング、中継は複数の route、バックエンドは新エンドポイントと状態、DB は案 B 相当。

**migration**: 要（案 B 相当以上）。RLS・`expected_tables` も B と同じ。C2 はストレージ構成の変更を伴う。

**後方互換**: 新旧 API を併存させる期間が要る。

**テスト方針**: E2E で多段フローの検証が必要（現状、音声の E2E はない。§6）。

**利点**: 待ち時間とタイムアウトの構造的な改善になりうる。大きなファイルや再開可能なアップロードに拡張しやすい。

**欠点**: 最大の変更量。**課金の起点（ジョブ投入）を 1 回に保つ仕組みは結局必要**で、案 A または B の考え方を内包する。単独では重複防止の根本解決にならない。

### 3.5 案 D: 何もしない（UI の注意書きのみ）

**概要**: #542 の注意書き（「すでに ほぞんされている ことが あるよ。ホームで ゆめを たしかめてから おくってね。」）に頼る。

**変更範囲 / migration / RLS / 後方互換**: すべてなし。

**テスト方針**: #542 の Jest のみ。

**利点**: リスクも工数もゼロ。実際の発生頻度が低いなら合理的な判断でもある。

**欠点**

- 利用者の注意に依存する。対象が子ども向けのひらがな UI（`DreamEntryLauncher.tsx`）で、「ホームで確かめてから送る」という判断を求めるのは酷。
- 発生しても気づけない。重複を検知するログも指標もない（現状は付録 B の事後クエリで推定するしかない）。
- 非 trial では再送のたびに実費が発生しうる（F9, F10, F11）。trial では「保存済みなのに上限メッセージ」という不整合が残る（§1.4）。
- #542 が再送を簡単にするので、むしろ発生しやすくなる。

### 3.6 案 E（追加案）: サーバー側で音声内容のハッシュを使って重複検出

**概要**: クライアントを変えず、Rails が受け取ったファイルの SHA-256（または Active Storage の checksum）を計算し、`(user_id, 音声ハッシュ)` を一意キーにする。

**観察**: #542 の再送は**同一 Blob をそのまま再送する**ので、バイト列が一致する。別の録音がバイト単位で一致することは実質ない。このため内容ハッシュでも再送を識別できる【推測: MediaRecorder の出力が毎回異なる前提。確認していない】。

**変更範囲**: backend と DB のみ。frontend / proxy は不要。DB は案 A と同形（`dreams` に列と部分一意 index。列名はハッシュ用）。

**migration / RLS / structure.sql**: 案 A と同じ重さ。

**後方互換**: 最も高い。旧フロントを含む**すべてのクライアントが自動的に守られる**。

**利点**: フロントとの連携が不要で、デプロイ順の制約もない。

**欠点**

- 全ファイルを読んでハッシュするコストがある（`params[:file]` は既にディスク上にあるので、実測するまでは小さい【推測】）。
- 「同じ内容を意図的に 2 回記録したい」場合を区別できない（音声では実質起こりにくい）。
- 規格化されたキーではなく、他の API に流用しにくい。
- ハッシュに基づく動作は、動いている理由が読み取りにくい。

**位置づけ**: 案 A のサーバー側を共通にして、ヘッダーがないリクエストのフォールバックとしてハッシュからキーを導出する、という**併用**が可能（§8 の判断事項）。単独採用より、A の補強として見るのが自然。

### 3.7 比較表

| 観点 | A: クライアントkey＋dreams一意 | B: 専用テーブル | C: 非同期化 | D: 何もしない | E: 内容ハッシュ |
|---|---|---|---|---|---|
| 変更層 | FE + 中継 + BE + DB | FE + 中継 + BE + DB | 全層（大） | UI のみ | BE + DB |
| migration | 1 本（軽い） | 2 本（作成 + RLS） | B 相当以上 | なし | 1 本（軽い） |
| RLS / CI 影響 | なし | あり（RLS migration、`expected_tables`） | あり | なし | なし |
| `structure.sql` 差分 | 小 | 大 | 大 | なし | 小 |
| 本番適用の重さ | 低 | 中 | 高 | なし | 低 |
| 後方互換 | 高（ヘッダー任意） | 高 | 要併存期間 | — | 最高（旧クライアントも対象） |
| 同時リクエスト | DB 一意制約で解決 | 一意制約 + 状態 | 状態管理が必要 | 対応不可 | DB 一意制約で解決 |
| 掃除（TTL） | 不要 | 要 | 要 | — | 不要 |
| 防止の確実性 | 高 | 高 | 単独では不十分 | 低 | 高（同一 Blob の再送に限る） |
| 工数感 | 小〜中 | 大 | 特大 | なし | 小 |

---

## 4. 推奨案と段階導入

### 4.1 推奨: 案 A

**理由**

1. **重複の原因（リクエストを識別できない）に直接対処する**。しかも変更は小さい。nullable 列 1 つと部分一意 index 1 つで、新テーブル、RLS、CI の `expected_tables` 更新、掃除ジョブが要らない（案 B との差）。
2. **状態を二重に持たない**。「処理中 / 完了 / 失敗」は既存の `analysis_status` で足りる。
3. **後方互換が高い**。ヘッダー任意なので、フロントとバックエンドを別々にデプロイ、ロールバックできる。本番は Vercel と Render が別ドメイン・別デプロイであるため、この性質は重要（`AGENTS.md` の「クロスドメイン前提」と整合）。
4. **競合を DB が解決する**。先行リクエストが未コミットの間に再送が来ても、一意制約が整合性を保つ。
5. **決済側の流儀に沿う**。`idempotency_key` という語彙、`RecordNotUnique` を受けて既存行を返す型、default deny の RLS 方針を踏襲できる。
6. 案 C（非同期化）は、案 A を内包した上でさらに変更が大きい。必要になれば A の上に積める。案 D は #542 が再送を簡単にした以上、非 trial の実費リスクが残る。

**案 E の扱い**: 初回リリースには含めない。ヘッダーなしリクエスト（旧フロント）の保護が必要だと判断した場合に、A の追加 PR として検討する（§8 の判断事項）。

**推奨しない/保留するもの**: 案 B は、将来「確定拒否の結果も再現したい」「複数 API に広げたい」などの要件が出た時点で再評価する。案 C は、アップロード時間そのものを短くしたい要件が出た時点で別途検討する。

### 4.2 PR 分割案

前提: **PR ②は #542 のマージ後**に作る（`failedAudio` state が #542 で入るため）。

| PR | 内容 | 依存 | 本番への作用 | 人間の承認ゲート |
|---|---|---|---|---|
| **①** backend 受け口＋一意制約 | migration（列＋部分一意 index）、`structure.sql` 再生成、`AudioDreamsController`（再送判定・`RecordNotUnique` 救済・再送時は加算しない・ログ）、`Dream` のキー形式検証、RSpec | なし（#542 と独立） | ヘッダーを送るクライアントがまだないので、挙動は変わらない | **ゲート G1: migration の本番適用**（§7） |
| **②** frontend がキーを保持・送信＋中継が転送 | `audioAnalysis.ts`（キー引数）、`DreamEntryLauncher`（Blob 生成時にキー作成、再送で同じキーを使う、破棄/成功で消す）、`route.ts`（ヘッダー検証・転送）、Jest。**UI 文言は変えない** | ① が本番で稼働済み、#542 がマージ済み | 以降、再送が冪等になる | ゲート G2: ① の本番確認後にマージ |
| **③** 中継のタイムアウト整合 | `route.ts` の `TIMEOUT_MS`（15 秒）の見直し、504 本文の構造化（`code` と `maybe_saved`）、必要なら `maxDuration` と中継での 1 回自動再送（同一キー） | ②（自動再送を入れる場合は必須） | 偽の失敗が減る | ゲート G3: Vercel の `maxDuration` 確認（§8） |
| **④** UI 文言の変更 | #542 の注意書きを「ふたつに ならないよ」系に変更（§5.4）、Jest 更新 | ② が本番で稼働し、再送が実際に冪等であることを確認済み | 利用者向けの案内が変わる | ゲート G4: 本番での再送確認後 |

④を②から分ける理由: ①だけが戻された（ロールバックされた）状態で②が動くと、キーは無視されて重複が起きるが、UI は「安全」と案内してしまう。**文言は、バックエンドと再送の冪等性を本番で確認してから変える**。文言変更は 1 PR で戻せるようにしておく。

### 4.3 ③の補足（タイムアウトの整合）

現在の値は互いに整合していない。

| 場所 | 値 | 根拠 |
|---|---|---|
| 中継 → Rails | 15 秒 | `route.ts:53`【事実】 |
| ブラウザ → 中継（#542 で追加） | 60 秒 | #542 PR 本文（`AUDIO_UPLOAD_TIMEOUT_MS`）。main には未反映 |
| Puma の worker | 90 秒 | `puma.rb:30`【事実】 |

冪等になれば、タイムアウトを伸ばしても縮めても二重作成は起きない。そのうえで、偽の失敗（Rails が処理を終えたのに 504）を減らすために中継の値を引き上げる余地がある。ただし**Vercel 関数の最大実行時間が上限になる**。`route.ts` には `maxDuration` がなく、現在の上限は【未確認】。15 秒で `AbortError` を捕捉できている以上、少なくとも 15 秒以上は許されているとみられる【推測】。

---

## 5. 失敗時の挙動とレスポンス契約

### 5.1 キーの扱い

- ヘッダー: `Idempotency-Key: <UUID v4>`。ブラウザは `crypto.randomUUID()`（利用できない環境では `getRandomValues` で v4 を生成）で作る。
- 一意の範囲: `(user_id, key)`。他ユーザーと同じキーでも衝突せず、他ユーザーの Dream の有無も漏れない。
- **キーなし**: 従来どおり（毎回新規作成）。
- **キーあり・形式不正**（UUID でない、長さが範囲外）: 400。中継と Rails の両方で検証する（ヘッダーへの任意文字列の混入を避ける）。
- **再送判定は `check_trial_audio_limit` より前**に行う。理由は §5.3。

### 5.2 レスポンス契約（同じキーでの再送）

「既存 Dream」は `current_user.dreams.find_by(idempotency_key: key)` で見つかる Dream を指す。

| 状況 | HTTP | 本文（要点） | 副作用 |
|---|---|---|---|
| キーなし | 200（従来どおり） | `{ id, message, status: "pending" }` | 毎回新規作成・加算・ジョブ投入（従来どおり） |
| キーあり・既存 Dream なし（初回） | 200 | `{ id, message, status: "pending" }`（従来と同形） | Dream 作成（キーを保存）、trial なら +1、ジョブ投入 1 回 |
| 既存 Dream あり・`pending`（処理中） | **200** | `{ id, message, status: "pending", idempotent_replay: true }` | **なし**（作成・加算・投入をしない） |
| 既存 Dream あり・`done`（完了） | **200** | `{ id, message, status: "done", idempotent_replay: true }` | なし |
| 既存 Dream あり・`failed`（解析失敗） | **200** | `{ id, message, status: "failed", idempotent_replay: true }` | なし。再解析は利用者が既存の `POST /dreams/:id/analyze` で行う（音声の受付と解析の失敗は別の段階） |
| 同時に届いた（先行がコミット前） | 200 | 先行のコミットを待ち、`RecordNotUnique` を受けて既存 Dream を再取得し、上の `pending` と同じ応答 | なし |
| 同じキー・異なるファイル（`audio.blob.byte_size` が不一致） | **422** | `{ error: "...", code: "idempotency_key_reused" }` | なし。再送では解消しないので #542 の `retryable: false` に該当 |
| キー形式不正 | **400** | `{ error: "...", code: "invalid_idempotency_key" }` | なし |
| 初回が検証エラーで終わった（Dream 未作成） | 422（従来どおり） | `{ error: [...] }` | Dream は作られず、キーも消費されない。同じキーで再送できる |
| 初回が保存後に 500（S3） | 再送は 200 | 既存 Dream の状態を返す | 追加の Dream なし。ジョブが積まれていなければ `pending` のまま残る（下記） |
| trial で既に上限到達、かつ再送 | **200**（`idempotent_replay`） | 既存 Dream の状態 | 403 にしない（上限チェックより再送判定を先に行うため） |
| trial で既に上限到達、新しいキー | 403（従来どおり） | `limit_reached: true` | なし |
| 未認証 / Origin 不正 / メール未確認 | 401 / 403 | 従来どおり | 認証・ガードが再送判定より前に走る |
| Rack::Attack の超過 | 429 | 従来どおり | ミドルウェア層で、再送判定より前。再送もこの 5 回/時の枠に数える（現状維持。§8） |

**200 を返す理由**: 利用者から見ると、最初の送信は「受理された」のが事実。再送への応答を 409 などにすると、#542 の失敗パネルが出てしまい、また `uploadAndAnalyzeAudio` は `res.ok` で成功を判定している（`audioAnalysis.ts:27-41`）。200 にすれば既存の成功処理（`handleAnalysisResult`: toast、`dream-created` イベント、`/home` への遷移）がそのまま使える。`AnalysisResult.status` の型は `"pending" | "done" | "failed"` で、`done` / `failed` も既に型に含まれる（`frontend/app/types.ts:93-101`）。

**応答の目印を本文にする理由**: 中継は Rails の本文だけを `NextResponse.json(parsedBody)` で返し、ヘッダーは引き継がない（`route.ts:109-110`）。そのため、再送の目印は本文のフラグ（`idempotent_replay`）に載せるのが確実。

**`pending` のまま取り残される Dream について**: Dream の保存とジョブ投入は別の操作で、間でプロセスが落ちると `pending` のまま残る【事実: 構造上】。本番の queue adapter が未指定で、Rails 既定の in-process 非同期のままなら、再起動やデプロイでキュー中のジョブが失われる【推測】。これは既存リスクで、本設計でも解消しない。再送は同じ `pending` を返し続けるので、利用者の復旧手段は既存の再解析（`POST /dreams/:id/analyze`、`dreams_controller.rb:173-212`）になる。恒久対策（古い `pending` の再投入など）は別 Issue とする（§8）。

### 5.3 trial ユーザーの扱い

現状（§1.4）は、1 回目が成功したあとの再送が 403 になる。案 A では**再送判定を上限チェックより前**に置くので、再送は 200 になり、利用者は保存済みの Dream へ誘導される。新規のキーは従来どおり 403。

加算は**初回作成時だけ**。再送では `increment!` しない。フロント側の「成功時に +1」（`DreamEntryLauncher.tsx:75-80`）は、1 回目の応答を取りこぼした利用者に対しては再送の成功時に初めて +1 になり、サーバー側の値と一致する。1 回目の応答を受け取れていれば再送自体が起きない。

### 5.4 キーの保持期間

| 場所 | 保持 | 破棄 |
|---|---|---|
| ブラウザ | **Blob と同じ寿命**。#542 の `failedAudio`（メモリ上の React state）と一緒に持つ | 成功時、「録音を破棄」、ページ離脱・リロード（Blob も消えるのでキーも不要） |
| サーバー | **Dream 行の寿命**（列が Dream にあるため、TTL も掃除ジョブも不要） | Dream の削除とともに消える |

- ブラウザの `localStorage` などには保存しない。Blob を永続化しない現状（#542）では、キーだけを残しても意味がない。将来 Blob を IndexedDB などに保存するなら、キーも同じ場所に保存する。
- 新しい録音は必ず新しいキー。再送だけが同じキー。
- 注意: Dream を利用者が削除した後に同じキーで再送すると、一意制約に当たらず新規作成される。実用上は起こりにくい【推測】。

### 5.5 #542 の UI 文言をどう変えるか

文言の最終決定は人間（§8）。案は次のとおり。いずれも**PR ④**で、バックエンドの冪等性を本番で確認したあとに変える。

| 場面 | 現在（#542） | ④の案 |
|---|---|---|
| 504 / タイムアウトの失敗パネルの注意 | 「すでに ほぞんされている ことが あるよ。ホームで ゆめを たしかめてから おくってね。」 | 「おくれたか わからなかったよ。もういちど おくっても、ゆめは ふたつに ならないから だいじょうぶ。」 |
| 再送が `idempotent_replay` だった場合 | （成功と同じ扱い） | 成功の toast は変えず、`message` に「さっきの こえは もう とどいていたよ」のように出す |
| trial の再送 | 403 と「上限に達しました」 | 200 で保存済みの夢へ誘導（文言は上の成功と同じ） |
| 「このページを はなれると 録音は きえるよ。」 | あり | 変更しない（Blob はメモリ上のままなので有効） |

`frontend/__tests__/` の Jest はこれらの文言を直接検査しているため、④で同じ PR 内で更新する。E2E（`frontend/e2e/`）には音声の送信を扱うものはない【事実: grep で確認。`audio|record` を含むのは `month-summary-flow.spec.ts` のみ】ので、E2E のセレクタ修正は発生しない。

---

## 6. テスト計画

### 6.1 RSpec（PR ①、`backend/spec/requests/audio_dreams_spec.rb` に追加）

既存の spec は `ActiveJob::Base.queue_adapter = :test` に切り替え、`audio_upload` ヘルパーを持つ（`audio_dreams_spec.rb:14-29`）。同じ作りで追加する。

1. **回帰**: キーなしで従来どおり作成される（既存テストがそのまま通る）。
2. **初回**: キーありで 200、Dream にキーが保存され、`AnalyzeDreamJob` が 1 本だけ積まれる。
3. **再送（処理中）**: 同じキーで 2 回目 → 200、`Dream.count` が増えない、同じ `id`、`idempotent_replay: true`、`AnalyzeDreamJob` が 1 本のまま。
4. **再送（完了 / 失敗）**: `analysis_status` を `done` / `failed` にして再送 → 200、本文の `status` が一致、ジョブが増えない。
5. **trial**: 1 回目で `trial_audio_count` が 1 になり、同じキーの再送は **200**（403 ではない）で count は 1 のまま。**新しいキー**では 403。
6. **加算の確認**: 再送で `trial_audio_count` が増えない。
7. **キー不一致**: 同じキーで別サイズのファイル → 422（`idempotency_key_reused`）、Dream が増えない。
8. **ユーザー分離**: 別ユーザーが同じキーで送ると別の Dream が作られる（他人の Dream の存在が漏れない）。
9. **形式不正**: 不正なキー → 400、Dream が作られない。
10. **競合（`RecordNotUnique`）**: 1 回目の探索が空を返した直後に別経路で同じキーの Dream が作られた状況を、探索の stub と事前作成で再現し、既存 Dream を返して 500 にならないことを確認する。リクエスト spec はトランザクション内で動くため、実スレッドの並行テストは不安定になりやすい。一意制約そのものは、モデル/DB レベルのテスト（同一 `(user_id, key)` の 2 件目が `RecordNotUnique`、`NULL` キーは何件でも許容）で確認する。
11. **未認証 / メール未確認**: 既存どおり 401 / 403 で、再送判定に到達しない（既存テストが通ること）。
12. **ログ**: 再送時に構造化ログ（`audio_upload.replayed` など。キー全体は出さない）が出ること。

バックエンドのテストは、ローカルでは Docker 内でのみ実行できる（開発メモ）。CI は `bundle exec rspec` と `structure.sql` 再生成チェック（`backend-test.yml:79-135`）を実行する。

### 6.2 Jest（PR ②、④）

- `frontend/__tests__/lib/audioAnalysis.test.ts`（#542 で追加される）: キーを渡すと `Idempotency-Key` ヘッダーが付く、キーなしでは付かない、再送で同じキーが付く。
- `frontend/__tests__/components/DreamEntryLauncher.test.tsx`: Blob ごとにキーが作られる、「もう一度送信」が同じ Blob と**同じキー**を使う、新しい録音は**別のキー**、成功・破棄でキーが消える。`crypto.randomUUID` はテストでモックする（jsdom の対応状況は【未確認】）。
- 中継の route テストは**新規**に必要。`frontend/__tests__/app/api/` には `checkout`、`image-proxy`、`auth` のテストがあるが、`analyze_audio_dream` のテストはない【事実】。ここに `frontend/__tests__/app/api/analyze_audio_dream/route.test.ts` を追加する。確認項目は、正しいキーを転送する、不正なキーは 400、キーなしでは転送しない、504 の本文形式、Cookie と Origin/Referer の転送が従来どおり。
- ④: 文言変更に合わせて Jest の期待値を更新（セレクタの重複は `locator().filter()` で絞る、という既存の注意に従う）。

### 6.3 E2E / 手動確認

- Playwright で音声録音を再現するにはフェイクメディアの設定が要り、現状その基盤はない【事実】。**ブラウザの録音フローの E2E は本件では必須にしない**。
- 代わりに、実バックエンドに対して API レベルで「同じキーで 2 回 POST → `id` が一致し、一覧の件数が +1 のまま」を確認する（E2E の CI がどのバックエンド設定で動くかは【未確認】。OpenAI を呼ぶジョブが走る設定かどうかも含む）。
- 手動確認（PR ② の本番確認、ゲート G2/G4）: 実機で、機内モードでの送信失敗 → 復帰 → 「もう一度送信」→ **Dream が 1 件のまま**になること。#542 で未確認とされている実機項目（iPhone Safari / Android Chrome、画面ロック）も、同じタイミングで確認する。

---

## 7. 本番ロールアウトとロールバック

### 7.1 migration の本番適用手順（PR ①）

`AGENTS.md` の方針（本番は成功済み・慎重に扱う、最小差分）と、既存の手順（`docs/phase5-dream-profiles-production-rls-summary.md:30-34`、`docs/2026-07-guard-must-runbook.md:110`）に従う。

1. **ローカル（Docker）**: migration を作り `db:migrate` → `structure.sql` を再生成する。CI と同じ PostgreSQL バージョンで生成する（`backend-test.yml:79-135` が差分ゼロを要求する）。
2. **PR ①を作成**、CI（RSpec、`structure.sql` 再生成チェック、RLS 状態チェック）を通す。
3. 🛑 **ゲート G1（人間）**: PR の承認に加え、**本番適用のタイミング**を決める。以降は人間が行う。
   1. Render の環境変数で `RUN_MIGRATIONS=true` を設定する（値を確認する際も秘密情報は出さない）。
   2. **その状態で PR ①をマージ → デプロイ**。`entrypoint.sh:125-133` が、アプリ起動前に `db:migrate` を実行する。
   3. Render のログで「マイグレーション完了」と、エラーがないことを確認する。
   4. `RUN_MIGRATIONS=false` に戻して再デプロイする。
4. 順序の理由: **新コードは列を参照する**ため、`RUN_MIGRATIONS` が `false` のままマージすると、列が存在せず音声アップロードが 500 になりうる【推測: 未知の属性への代入エラー】。必ず手順 3-1 を先に行う。
5. 本番確認: ヘッダーなしで従来どおり動くことを確認する（ヘッダーを送るクライアントがまだないので、通常の音声記録が 1 件作れれば足りる）。

DB 側の確認事項（人間が行う）: `dreams` の行数（index 作成方式の判断）、DB の所在（Render か Supabase か。§8）。

### 7.2 PR ②〜④のロールアウト

- ② は Vercel のデプロイのみ（DB・環境変数の変更なし）。デプロイ前に、① が本番で稼働していることを確認する。
- ③ は `maxDuration` が絡む場合のみ設定が変わる。人間が Vercel 側の制限を確認する。
- ④ は ② と再送の実機確認が済んでから。
- いずれも `AGENTS.md` の指摘どおり、Vercel と Render で URL 解決や Cookie が違うため、**本番（クロスドメイン）で再送の動作を確認する**。決済系の経路（`/api/checkout`、Webhook）には触れない。

### 7.3 ロールバック

| 対象 | 方法 | 注意 |
|---|---|---|
| ④（文言） | PR を revert | 文言のみ |
| ②（フロント） | Vercel の以前のデプロイに戻す、または revert | キーが送られなくなり、バックエンドは従来動作になる。**④が出ているなら④も戻す**（安全だという案内だけが残るのを避ける） |
| ①（バックエンド） | Render で以前のデプロイに戻す、または revert | **列と index は残してよい**。nullable で旧コードは無視し、部分 index は NULL 行を含まないため旧コードに影響しない。②が出ている場合、キーが無視されて重複が再び起こりうるので、②と④も戻す |
| migration（DB） | **原則 `db:rollback` を本番で実行しない**。必要な場合のみ、人間の明示的な承認のもと、`down`（index と列の削除）を `RUN_MIGRATIONS` 経由で適用する | 履歴上、安全弁のない手動の `db:migrate` 再実行は避ける方針（`docs/2026-07-guard-must-runbook.md:25-29` の「再実行しない」の考え方） |

戻す順序は、**フロントエンド（④→②）を先、バックエンド（①）を後**。

### 7.4 監視

- 再送判定のたびに構造化ログを出す（例: `event=audio_upload.replayed`、`user_id`、`dream_id`、`analysis_status`。キーは先頭数文字までにとどめる）。秘密情報は出さない（`AGENTS.md`）。
- このログが出る頻度が、そのまま「本当にこの問題が起きていたか」の実測になる。リリース後 2〜4 週間の件数を見て、案 D（何もしない）に比べた効果を事後評価できる。
- 決済側の `PaymentsObservability` / `[PaymentsKPI]` は決済専用のため、音声では流用せず、軽量な `Rails.logger` の JSON 行で足りる。

---

## 8. 未確認事項と、人間が決めること

### 8.1 未確認事項

- [ ] **発生頻度**: 本番で実際に重複 Dream が起きているか。付録 B の読み取り専用 SQL で推定できる（実行は人間）。
- [ ] **Rails がクライアント切断後も処理を続けるか**: Render のプロキシと Puma の挙動。コールドスタート中のリクエストが Puma に届く前に破棄されるのかどうか。
- [ ] **Vercel 関数の最大実行時間**: `route.ts` に `maxDuration` の指定がなく、プランとプロジェクト設定による上限が不明。PR ③の値を決める前提。
- [ ] **Active Job の本番構成**: `production.rb:71` はコメントアウトで、gem も追加されていない。Rails 既定の in-process 非同期のままなら、再起動で未実行ジョブが失われる。本番で確認が必要。
- [ ] **DB の所在**: `docs/2026-07-guard-must-runbook.md:6` は「DB=Render Postgres」、`docs/phase5-dream-profiles-production-rls-summary.md` は Supabase の RLS 警告に言及。migration の実行場所と RLS の扱いに影響する。
- [ ] **`dreams` に RLS がない理由**: `structure.sql` では 7 テーブルのみ RLS が有効で、`dreams`、`users` などは含まれない。意図的かどうかは本件と別に確認する（本設計は `dreams` の RLS 状態を変えない）。
- [ ] **`dreams` の行数**: index 作成を通常の `add_index` にするか `CONCURRENTLY` にするかの判断材料。
- [ ] **Render の自動デプロイ設定**: マージで自動デプロイされるか、手動か。§7.1 の順序（`RUN_MIGRATIONS=true` を先に設定）に影響する。entrypoint のコメントは Pre-Deploy Command での migration に触れているが（`entrypoint.sh:115-116`）、現行は `RUN_MIGRATIONS` が使われている記録がある。
- [ ] **ブラウザでの `crypto.randomUUID` 対応**: セキュアコンテキスト（https）でのみ使える。対象ブラウザ（iOS Safari の最低バージョン）に合わせてフォールバックが必要か。
- [ ] **Render 経由でのカスタムヘッダー（`Idempotency-Key`）の通過**: 通常は通過する【推測】が、ステージングか本番の最初の確認で検証する。
- [ ] **`AnalyzeAudioDreamJob` は未使用か**: コントローラは `AnalyzeDreamJob` を呼んでおり、`AnalyzeAudioDreamJob` の呼び出しは grep で見つからなかった。デッドコードの可能性（本件の範囲外）。
- [ ] **`POST /dreams` の音声添付**: `dreams_controller.rb:100-105` に別の音声添付経路がある。フロントから使われているかは未確認（本件は `/analyze_audio_dream` のみを対象）。
- [ ] **PR #542 の最終形**: 本書は #542 のレビュー時点の PR 本文（`failedAudio`、`AudioUploadError`、`retryable`、`maybeSaved`）に基づく。マージ時の実装と差があれば PR ②の設計を調整する。

### 8.2 人間が決めること

- [ ] **採用案**: 案 A で進めてよいか（B / C / D / E のいずれかに変更するか）。
- [ ] **PR ①の着手と、G1（migration の本番適用）の日時と実施者**。
- [ ] **列名**: `idempotency_key`（汎用・決済と同じ語彙。推奨）か、`audio_upload_key`（用途を限定）か。
- [ ] **キーなしリクエストの扱い**: 従来どおり（推奨。最小変更）か、内容ハッシュ（案 E）で補うか。
- [ ] **再送判定を上限チェックより前に置く**（trial の再送を 403 にしない）ことの承認。
- [ ] **`failed` の Dream への再送**: 200 で `status: "failed"` を返す（推奨）か、自動で再解析を許すか。後者は再課金につながるため、推奨しない。
- [ ] **キー不一致の 422**: 入れるか（ファイルサイズだけの簡易照合）。入れない場合は、不一致を黙って既存 Dream に結びつけることになる。
- [ ] **index の作成方式**: 通常か `CONCURRENTLY` か（`dreams` の行数確認後）。
- [ ] **Rack::Attack の 5 回/時に再送を含めるか**: 現状は含まれる。再送判定はミドルウェアより後なので、除外には別の仕組みが要る。当面は現状維持を推奨。
- [ ] **中継のタイムアウト値と自動再送**: 15 秒をいくつにするか、中継での同一キーの 1 回自動再送を入れるか（`maxDuration` の確認後）。
- [ ] **UI 文言（§5.5）の確定と、④の公開タイミング**。
- [ ] **#542 を先にマージするか**: 本設計の ②は #542 に依存する。#542 の注意書きは、④まで残すことを前提にしている。
- [ ] **実測の実施**: 付録 B のクエリを誰がいつ実行するか（実行結果は件数のみ共有し、`user_id` などは共有しない）。
- [ ] **別 Issue にする周辺リスク**: (a) `AnalyzeDreamJob` の 3 回リトライによる Whisper の再課金（F9）、(b) 保存後・投入前の取り残し `pending` の回収、(c) trial の上限チェックと加算の競合（F8）、(d) `/dreams` の音声添付経路と `AnalyzeAudioDreamJob` の整理、(e) `dreams` の RLS 方針。

---

## 付録 A: 擬似コードとスキーマ案（実装ではない）

本節は設計の説明用で、そのまま採用するものではない。実装・migration ファイルは本 PR に含めない。

### A.1 スキーマ案（案 A）

```sql
-- dreams
ALTER TABLE dreams ADD COLUMN idempotency_key varchar;   -- NULL 許容・DEFAULT なし

CREATE UNIQUE INDEX index_dreams_on_user_id_and_idempotency_key
  ON dreams (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;                      -- 既存行は NULL のため index に入らない
-- 行数が多い場合は CONCURRENTLY（Rails では disable_ddl_transaction! + algorithm: :concurrently）
```

### A.2 コントローラの擬似コード（案 A）

```ruby
class AudioDreamsController < ApplicationController
  before_action :require_verified_email, only: [:create]
  before_action :replay_if_duplicate,    only: [:create]   # ← 上限チェックより前
  before_action :check_trial_audio_limit, only: [:create]

  def create
    # ...（既存どおり。Dream.new に idempotency_key: @idempotency_key を含める）
    if dream.save
      user.increment!(:trial_audio_count) if user.trial_user?   # 初回作成時だけ
      AnalyzeDreamJob.perform_later(dream.id)
      render json: { id: dream.id, message: "…", status: "pending" }, status: :ok
    end
  rescue ActiveRecord::RecordNotUnique
    # 同時に届いた同一キー。先行がコミット済みなので既存 Dream を再取得して返す
    existing = current_user.dreams.find_by!(idempotency_key: @idempotency_key)
    render_replay(existing)
  end

  private

  def replay_if_duplicate
    raw = request.headers["Idempotency-Key"]
    return if raw.blank?                                   # キーなし = 従来動作
    return render_error(400, "invalid_idempotency_key") unless uuid?(raw)

    @idempotency_key = raw
    existing = current_user.dreams.find_by(idempotency_key: raw)
    return unless existing                                  # 初回 → create へ進む

    return render_error(422, "idempotency_key_reused") if mismatch?(existing, params[:file])
    render_replay(existing)                                 # 200。加算・投入なし
  end

  def render_replay(dream)
    render json: { id: dream.id, status: dream.analysis_status,
                   message: "…", idempotent_replay: true }, status: :ok
  end
end
```

### A.3 フロントの擬似コード

```ts
// DreamEntryLauncher: Blob が確定したときに 1 回だけ作る
const key = newIdempotencyKey();                // crypto.randomUUID() / getRandomValues の v4
setFailedAudio({ blob, key, ... });             // #542 の state に Blob と一緒に持つ
await uploadAndAnalyzeAudio(blob, { idempotencyKey: key });
// 「もう一度送信」は同じ { blob, key } を使う。成功・「録音を破棄」で state ごと消す

// audioAnalysis.ts
fetch("/api/analyze_audio_dream", { method: "POST", body: formData,
  headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined });

// route.ts（中継）
const key = req.headers.get("idempotency-key");
if (key && !UUID_RE.test(key)) return NextResponse.json({ error: "…" }, { status: 400 });
// Rails への fetch の headers に、key があれば "Idempotency-Key": key を追加
```

### A.4 案 B のスキーマ案（比較用）

```sql
CREATE TABLE audio_upload_attempts (
  id               bigint PRIMARY KEY,
  user_id          bigint NOT NULL REFERENCES users(id),
  idempotency_key  varchar NOT NULL,
  request_fingerprint varchar,                 -- 例: byte_size:checksum
  status           varchar NOT NULL DEFAULT 'pending',   -- pending / accepted / failed / uncertain
  dream_id         bigint REFERENCES dreams(id) ON DELETE SET NULL,
  error_code       varchar,
  expires_at       timestamp,
  created_at       timestamp NOT NULL, updated_at timestamp NOT NULL,
  CONSTRAINT audio_upload_attempts_status_check CHECK (status IN (...))
);
CREATE UNIQUE INDEX ... ON audio_upload_attempts (user_id, idempotency_key);
ALTER TABLE audio_upload_attempts ENABLE ROW LEVEL SECURITY;   -- 同一 PR で。policy なし（default deny）
```

## 付録 B: 発生実績の推定（読み取り専用 SQL 案・人間が実行）

同じユーザーが、同じ音声内容（Active Storage の checksum が一致）で複数の Dream を持っているかを調べる。**読み取り専用**。結果は件数のみ共有し、`user_id` などの個別値は共有しない。本書の作成中には実行していない。

```sql
SELECT d.user_id,
       b.checksum,
       COUNT(*)            AS dream_count,
       MIN(d.created_at)   AS first_created_at,
       MAX(d.created_at)   AS last_created_at
  FROM dreams d
  JOIN active_storage_attachments a
    ON a.record_type = 'Dream' AND a.record_id = d.id AND a.name = 'audio'
  JOIN active_storage_blobs b ON b.id = a.blob_id
 GROUP BY d.user_id, b.checksum
HAVING COUNT(*) > 1
 ORDER BY last_created_at DESC;
```

- 列名は `structure.sql:20-27`（`active_storage_attachments`）と `:53-63`（`active_storage_blobs.checksum`）で確認済み。
- `checksum` が同じ = 同じバイト列。再送による重複の強い証拠になる（逆に、ここに出ない重複は検出できない。例: 一方の音声ファイルが欠損している場合）。
- 0 件でも、将来起きないことの証明にはならない。件数が多い場合は、優先度を上げる材料になる。

## 付録 C: 参照ファイル

- `backend/app/controllers/audio_dreams_controller.rb`、`backend/app/models/dream.rb`、`backend/app/jobs/analyze_dream_job.rb`、`backend/app/models/ai_usage_log.rb`
- `backend/app/controllers/checkout_controller.rb`、`backend/app/models/checkout_attempt.rb`、`backend/db/migrate/20260828000000_create_checkout_attempts.rb`、`backend/db/migrate/20260923000000_enable_rls_on_checkout_attempts.rb`
- `backend/config/initializers/rack_attack.rb`、`backend/config/routes.rb`、`backend/config/puma.rb`、`backend/config/environments/production.rb`、`backend/entrypoint.sh`
- `backend/db/structure.sql`、`.github/workflows/backend-test.yml`、`backend/spec/requests/audio_dreams_spec.rb`
- `frontend/app/api/analyze_audio_dream/route.ts`、`frontend/lib/audioAnalysis.ts`、`frontend/app/components/DreamEntryLauncher.tsx`、`frontend/app/types.ts`
- `docs/2026-07-guard-must-runbook.md`、`docs/phase5-dream-profiles-production-rls-summary.md`
- PR #542（`fix/keep-audio-on-upload-failure`、未マージ）
