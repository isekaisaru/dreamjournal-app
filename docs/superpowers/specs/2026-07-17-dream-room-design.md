# 夢の部屋（額縁の壁）設計仕様

- 日付: 2026-07-17
- 対象: YumeTree フロントエンド（Next.js 16 + Tailwind v4）＋ バックエンド（Rails 7.2, 最小追加）
- 位置づけ: `phase5-dream-profiles-design.md` の将来アイディア「夢の部屋: プロフィールごとに夢ワールドを持つ箱庭UI」。
  世界観MVP**最終候補**（第1弾: 今週のゆめニュース #423／第2弾: プロフィール別シェアカード #424）。

## 0. コンセプト・差別化軸

「夢の森」＝プロフィールの**成長と感情の可視化**（木・実・季節）に対し、「夢の部屋」＝**AI生成画像のギャラリー**。
現状、AI生成画像は夢詳細画面でしか見られず、見返す場所がない。部屋はその子専用の「額縁の壁」として、生成済みの絵を集めて振り返れる場所にする。

## 1. スコープ（決定事項）

- 最大**6枚**の額縁。`image_generated_at`の新しい順（同時刻は`id desc`でタイブレーク）。
- 各額縁の画像は`GET /dreams/:id`を**順次**（直列）lazy-fetchし、取得できた額縁から順にフェードインする演出。
- 額縁タップで`/dream/${id}`（夢詳細）へ遷移。
- 「もっと見る」（7枚目以降のページング）は**スコープ外**（将来PR）。
- 入り口は2箇所、いずれも既存「森」画面から:
  1. 森詳細ページ（`/forest/[profileId]/page.tsx`）のヘッダー行に「へやを のぞく」リンクを追加
  2. `TreePreviewSheet`のCTA列に同様のリンクを追加（`router.push(\`/room/${profile.id}\`)`）
- 新規ナビタブは追加しない（`BottomTabBar`は4枚＋FABで満席のため）。

## 2. バックエンド変更（最小・追加のみ）

`backend/app/controllers/dreams_controller.rb#index`の`index_columns`に`image_generated_at`を1列追加する。

現状:
```ruby
index_columns = %i[id title content created_at analysis_json analysis_status analyzed_at user_id dream_profile_id]
```

変更後:
```ruby
index_columns = %i[id title content created_at analysis_json analysis_status analyzed_at user_id dream_profile_id image_generated_at]
```

- `generated_image_url`（base64・最大1MB/枚）は**引き続き一覧から除外**。既存の「一覧は軽量に保つ」設計方針を維持する。
- 新規エンドポイント・migration・DBスキーマ変更なし（`image_generated_at`列・部分インデックスは既存）。
- フロントは既存`getDreamsForProfile(profileId)`（`GET /dreams?dream_profile_id=X`）をそのまま使い、`image_generated_at`が入っている夢だけを抽出する。

## 3. フロントエンド: 新規ルート `app/room/[profileId]/page.tsx`

`app/forest/[profileId]/page.tsx`と同じ`useParams`／`getDreamProfiles`＋`getDreamsForProfile`パターンを踏襲する。

### 3-1. データ取得とソート

```ts
const dreams = await getDreamsForProfile(profileId); // 既存: created_at desc
const withImages = dreams
  .filter((d) => d.image_generated_at)
  .sort((a, b) => {
    const diff = new Date(b.image_generated_at!).getTime() - new Date(a.image_generated_at!).getTime();
    return diff !== 0 ? diff : b.id - a.id; // 同時刻は id desc でタイブレーク
  })
  .slice(0, 6);
```

`Dream`型に`image_generated_at?: string`を追加する（`generated_image_url?: string`の隣）。

### 3-2. 額縁ごとの逐次lazy-fetch

- マウント時に`AbortController`を1つ生成し、`useEffect`のクリーンアップで`abort()`する。
- `withImages`を**直列**（`for...of` + `await`）でループし、各夢について`apiClient.get<Dream>(\`/dreams/${id}\`, { signal: controller.signal })`を呼び、`generated_image_url`を取得できた額縁から`state`を更新してフェードイン表示する。
- 各フェッチは独立した`try/catch`:
  - 成功 → その額縁の状態を`{ status: "loaded", imageUrl }`にする
  - 失敗（Abort以外）→ その額縁の状態を`{ status: "error" }`にする。**ループは止めず次の額縁へ進む**
  - `AbortError`（unmount起因）→ 状態更新を行わない（`if (controller.signal.aborted) return;`を各`setState`前に置く）

### 3-3. 額縁の表示状態

| 状態 | 表示 |
|---|---|
| `loading`（取得中/未着手） | プレースホルダー枠（額縁のシルエット＋ぼんやりした光） |
| `loaded` | `next/image`（`unoptimized`＋`onError`）で画像表示。タップで`/dream/${id}`へ |
| `error` | ひび割れた額縁の意匠＋「もういちど」ボタン（その額縁だけ再フェッチ。**非表示にはしない**——記録が消えたように見えるのを避ける） |

### 3-4. 空状態（2分岐）

- **夢が0件**（`dreams.length === 0`）: 「まだ ゆめが きろくされていないよ」＋「ゆめを きろくする」ボタン → `/dream/new`
- **夢はあるが画像が0件**（`dreams.length > 0` かつ `withImages.length === 0`）: 「まだ えが かざられていないよ」＋「ゆめのえを つくる」ボタン → 最新の夢（`dreams[0].id`、既存`created_at desc`順の先頭）の詳細 `/dream/${dreams[0].id}`

いずれも`/home`へ戻すだけの導線にはしない。

### 3-5. 画像表示パターンの再利用

新しい画像表示ロジックは作らない。`DreamShareCard`のオンスクリーン表示と同じ構成——`next/image`に`unoptimized`props＋`onError`ハンドラを渡すだけの素の表示——を踏襲する。`/api/image-proxy`はcanvas書き出し（PNG保存）専用であり、額縁は保存機能を持たないため使用しない。

### 3-6. 意匠・アクセシビリティ

- 壁紙: `profile.color`ベースのグラデーション＋簡単な窓・床のCSS意匠（新規画像アセットは使わない）
- ヘッダー: 「へやから でる」→ `/forest/${profileId}`、`{avatar_emoji} {name} の おへや`（長い名前は`truncate`）
- 額縁グリッド: 375px幅で崩れない（2列グリッド等、実装時に確定）
- 各額縁は`<button>`要素にしてキーボードのTab移動・Enterキー操作に対応、フォーカスリング表示
- 画像の`alt`は夢タイトル（空なら「ラベルなし」等のフォールバック）
- `useReducedMotion()`（既存森コンポーネントと同じ流儀）でフェードイン演出を無効化

## 4. 入り口の実装箇所

- `app/forest/[profileId]/page.tsx`: ヘッダー行（「もりに もどる」の並び）に「へやを のぞく」リンクを追加。`router.push(\`/room/${profileId}\`)`。
- `app/components/forest/TreePreviewSheet.tsx`: 既存の「この きを 見る ›」ボタンの下（またはとなり）に「へやを のぞく」ボタンを追加。`onOpen`とは別の新規ハンドラ（例: `onPeekRoom`）を親（`ForestScene.tsx`）から渡し、`router.push(\`/room/${p.id}\`)`する。

## 5. 認証ゲート登録（新規ルートのため必須・3箇所）

新規ルート追加時は以下3箇所への登録が必須（過去の`/insights`追加時の教訓）。今回はテストで登録漏れを構造的に検出できるようにする。

- `frontend/context/AuthContext.tsx`: `AUTH_VERIFY_PATH_PREFIXES`に`/room`を追加。**この定数を`export`する**（現状非export）
- `frontend/proxy.ts`: `isProtectedPage`判定に`/room`を追加。現状は関数内のインライン`pathname.startsWith(...)`チェーンで外部からテストできないため、**`AUTH_VERIFY_PATH_PREFIXES`と同じ形の`export const PROTECTED_PAGE_PREFIXES`を切り出し**、`isProtectedPage`はそれを参照するよう書き換える（ロジック変更なし、ミニマルなテスト容易性向上のリファクタ）。`config.matcher`にも`"/room/:path*"`を追加
- `frontend/lib/site.ts`: `NON_INDEXABLE_PATH_PREFIXES`に`/room`を追加（既にexport済み）

### 登録漏れ検出テスト

新規`frontend/__tests__/lib/route-registration.test.ts`で、`AUTH_VERIFY_PATH_PREFIXES`・`PROTECTED_PAGE_PREFIXES`・`NON_INDEXABLE_PATH_PREFIXES`・`proxy.ts`の`config.matcher`をまとめてimportし、`"/room"`（および`config.matcher`は`"/room/:path*"`）が全てに含まれることを1つのテストファイルで検証する。既存`__tests__/app/seo.test.ts`の`it.each`パターンを踏襲。

## 6. テスト方針

### バックエンド（RSpec request spec）

`dreams_spec.rb`の`GET /dreams (index)`に以下2点をアサートする新規ケースを追加:
1. `image_generated_at`がレスポンスに含まれる（画像生成済みの夢を用意して値を検証）
2. `generated_image_url`キー自体がレスポンスに存在しない（`json_response.first).not_to have_key('generated_image_url')`）— 一覧の軽量性を担保する既存方針の回帰防止

### フロントエンド（component test, 新規 `__tests__/app/room/page.test.tsx` 相当）

- 額縁が`image_generated_at`降順（同時刻は`id`降順）で並ぶこと
- 6枚を超える画像持ち夢がある場合、先頭6件のみ表示されること
- 逐次lazy-fetchで、取得成功した額縁から順に画像が表示されること
- 1件の`GET /dreams/:id`が失敗しても、他の額縁の取得・表示が続行されること。失敗した額縁に「もういちど」ボタンが表示され、クリックでその額縁だけ再フェッチされること
- unmount後（ページ離脱後）に遅れて解決するfetchが、状態更新を行わないこと（`AbortController`のモックまたはunmount後のPromise解決タイミングを検証）
- 空状態2分岐: 夢0件→「ゆめを きろくする」（`/dream/new`へのリンク）／画像0件→「ゆめのえを つくる」（最新夢詳細へのリンク）
- 長いプロフィール名で見出しが`truncate`されること
- 額縁の`alt`属性が夢タイトルであること

### ルート登録（新規, §5参照）

`route-registration.test.ts`で3箇所＋matcherの整合を検証。

## 7. 開発開始条件

**PR #428（backend gem 6件の一括更新）がCI全緑・Codex指摘なしで`main`へマージされた後**、最新の`origin/main`から新規worktreeを作成して着手する（現worktreeは設計docのみをコミットする）。

## 8. 境界

**触る**: `backend/app/controllers/dreams_controller.rb`（`index_columns`に1列追加）/ `frontend/app/room/[profileId]/page.tsx`（新規）/ `frontend/app/types.ts`（`Dream.image_generated_at`追加）/ `frontend/app/forest/[profileId]/page.tsx`（入り口リンク追加）/ `frontend/app/components/forest/TreePreviewSheet.tsx`・`ForestScene.tsx`（入り口リンク追加）/ `frontend/context/AuthContext.tsx`・`frontend/proxy.ts`・`frontend/lib/site.ts`（認証ゲート登録＋テスト容易性のためのexport化）/ テスト（新規＋`dreams_spec.rb`拡張）。

**触らない**: migration・DBスキーマ・新規APIエンドポイント・Stripe・OpenAI・`DreamShareCard`本体・「もりの一覧」`/forest`・BottomTabBar（新規タブは追加しない）・7枚目以降のページング（将来PR）。
