# AI と一緒に開発する流れ（Claude・Codex・Gemini）

> 一行まとめ: **Claude が作り、Codex が全 PR を自動でチェックし、大事な PR だけ Gemini（Antigravity）が手元で読むだけのチェックをする。最後に決めるのは人間**。

料理にたとえると、Claude が「料理する人」、Codex が「毎回の味見係」、Gemini が「特別な料理だけの 2 人目の味見係」、オーナー（リポジトリの持ち主）が「お店に出すか決める人」です。

## 役割分担

| 担当 | やること | どこで動くか |
|---|---|---|
| Claude（Claude Code） | 調べる・テストを先に書いて実装する・PR を作る | Claude のプロジェクト |
| Codex | **全 PR** の独立レビュー | GitHub（PR を開くと自動。追加の push 後は `@codex review` とコメント） |
| Gemini（Antigravity） | **重要な PR だけ** の追加レビュー。**読むだけ** | オーナーの PC の Antigravity（App か CLI の `agy`） |
| オーナー | マージ・本番デプロイ・DB 操作・課金設定を決める | GitHub・Render・Vercel・Supabase |

### 「重要な PR」とは

次のどれかに触る PR です。

- 認証（ログイン・Cookie・JWT）
- 決済（Stripe）
- DB（`backend/db/migrate/`・`structure.sql`・RLS）
- セキュリティ（秘密情報・Sentry に送るデータ・CORS など）
- AI の利用制限（無料プランの回数上限・プレミアム限定機能）

## 1 つの変更の流れ

1. オーナーが「やりたいこと」を書く
2. Claude がテストを先に書いて（赤）→ 実装して（緑）→ PR を作る
3. CI（Jest / RSpec / Playwright / Brakeman）と Codex が自動で動く
4. 重要な PR なら、オーナーが下の手順で Antigravity にレビューしてもらう
5. Claude が指摘を直す（直さない指摘は、理由を PR に書く）
6. オーナーが読んで、マージするかを決める

## Antigravity で PR をレビューする手順（手動・API キー不要）

### 守ること

- Gemini は **読むだけ**。コードの編集・commit・push・マージはさせない
- 秘密情報（`.env` の中身・API キー・パスワード）と、利用者の夢データ（本番 DB の中身・ログ・Sentry のイベント）は AI に渡さない
- コマンドの実行許可を聞かれたら、`git diff`・`git log`・`git rev-parse` など読むだけのもの以外は断る
- Antigravity の差分画面の「Discard」は確認なしですぐ消えるので押さない

### 手順

1. 手元のリポジトリで最新を取り、PR のブランチに切り替える

   ```bash
   git fetch origin
   git switch <PR のブランチ名>
   git pull
   ```

2. レビューする範囲（base と head の SHA）を確かめてメモする

   ```bash
   git rev-parse origin/main   # base SHA（比べる元）
   git rev-parse HEAD          # head SHA（PR の最新）
   ```

3. リポジトリのフォルダで Antigravity を開く（初回は Google AI Pro の個人アカウントでログイン）
4. 次の文を貼る（`<base>` と `<head>` は 2 でメモした SHA に置き換える）

   ```
   ファイルは変更しないでください。commit・push もしないでください。読むだけでお願いします。
   レビュー範囲は base <base> と head <head> です。
   `git diff <base>...<head>` の変更を、docs/ai/review-checklist.md の観点でレビューしてください。
   .env などの秘密情報のファイルは開かないでください。
   最初の行に「base: <base> / head: <head>」と書いてから、日本語で、重要なものから最大 10 件指摘してください。
   ```

5. 大事な指摘を、base と head の SHA を添えて PR に自分でコメントする（または Claude に「この指摘を直して」と渡す）
6. その後に PR へ push があったら、head SHA が変わるので、必要ならもう一度レビューする

## AI に任せないこと

- `main` へのマージ、本番デプロイ、本番 DB の操作、列や表の削除
- API キーや決済（Stripe）の設定

## Antigravity の利用条件・料金・データの扱い（公式情報、確認日 2026-11-27）

| 項目 | 公式に書かれていること | 出典 |
|---|---|---|
| 使えるプラン | 個人の Google アカウントの Free / Pro / Ultra でログインできる。Google Workspace のプランには含まれない。AI Pro と Ultra は個人の Google アカウントが必要 | [Install](https://antigravity.google/docs/install/)・[Pricing](https://antigravity.google/pricing) |
| 料金 | Free は月 0 ドルで週ごとの利用枠。Google AI Pro は 5 時間ごとに回復する多めの枠と、高めの週の上限。枠を超えたときの追加購入は「任意」 | [Pricing](https://antigravity.google/pricing) |
| 読むファイル | 作業フォルダの `GEMINI.md` と `AGENTS.md` のルールを読む | [Gemini CLI からの移行](https://antigravity.google/docs/cli/gcli-migration) |
| 差分の確認 | App の差分画面か、CLI の `/diff` で、手元の変更を見られる | [Review changes](https://antigravity.google/docs/review-changes/) |
| CI での自動実行 | ヘッドレス（`agy -p`）はログイン済みの手元の資格情報を使う。CI では Gemini API キーなどの別の設定が必要 | [Headless](https://antigravity.google/docs/cli/headless/)・[Install](https://antigravity.google/docs/install/) |
| データの扱い（API キーの場合） | Gemini API の無料枠では、送った内容が Google の製品改善に使われる。有料枠では使われない | [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing) |

> AI Pro でログインした Antigravity に送った内容がどう扱われるかは、上の公式ページには書かれていませんでした。だからこそ、秘密情報と夢データは渡さないルールにしています。

## 使わないことにした方法（理由つき、確認日 2026-11-27）

| 方法 | 使わない理由 | 出典 |
|---|---|---|
| Gemini Code Assist on GitHub（個人向け） | 2026-07-17 に提供終了 | [公式](https://developers.google.com/gemini-code-assist/docs/deprecations/consumer-code-review) |
| Gemini Code Assist on GitHub（企業向け） | 2026-10-09 から新規契約できない | [公式](https://docs.cloud.google.com/gemini/docs/codeassist/sunset) |
| Gemini CLI（AI Pro でログイン） | 2026-06-18 から AI Pro では使えず、Antigravity に移行 | [公式](https://developers.google.com/gemini-code-assist/docs/deprecations/code-assist-individuals) |
| GitHub Actions で Gemini を自動実行 | AI Pro のログインは CI で使えず、Gemini API キーを Secrets に入れる必要がある。無料枠だと送ったコードが改善に使われる。PR コメントから AI を動かせるため、権限の設定を誤ると危ない | [Headless](https://antigravity.google/docs/cli/headless/)・[Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing) |

## 設定ファイルの場所

| ファイル | 読むもの | 中身 |
|---|---|---|
| `docs/ai/review-checklist.md` | Antigravity・人（Codex は自動では読まない） | レビューの観点（日本語）。Codex に使わせたいときは `@codex review docs/ai/review-checklist.md の観点で` とコメントする |
| `AGENTS.md`・`CLAUDE.md` | 手元の AI | 現在は `.gitignore` で非公開のまま。GitHub 上の Codex からは読めない |
