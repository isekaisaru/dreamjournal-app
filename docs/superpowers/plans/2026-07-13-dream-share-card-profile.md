# プロフィール別シェアカード（DreamShareCard拡張）Implementation Plan

**Goal:** 既存の夢シェアカードにプロフィール名・アバター・色を加え、AI画像がない夢や画像読込に失敗した夢でも、プロフィールらしいPNGカードを保存できるようにする。

**Architecture:** `DreamsController#show` が既存の軽量 `dream_profile` JSONを返し、夢詳細ページがその値を `DreamShareCard` に渡す。カードは画像URLがある場合は既存画像を使い、ない場合はCSSと絵文字によるフォールバックを描画する。既存のPNG保存、画像proxy、iOS共有、リンクコピーの契約は維持する。

**Tech Stack:** Rails 7.2 / RSpec request specs / Next.js 16 App Router / React / TypeScript / Tailwind v4 / Jest + Testing Library / `html-to-image`。

**Source spec:** `docs/superpowers/specs/2026-07-13-dream-share-card-profile-design.md`

## Global Constraints

- 新規API、migration、DBスキーマ変更、OpenAI呼び出し、認証変更は追加しない。
- 公開共有URLは作らない。「リンクをコピー」は既存どおり認証付き夢詳細URLをコピーするだけとする。
- 既存の画像proxy、data URL許可リスト、iOS Web Share、ダウンロード処理を後退させない。
- プロフィール情報が一時的に欠けてもカード自体を壊さず、プロフィールチップだけを省略する。
- `profileColor` はバックエンドの6桁hex validationを前提にしつつ、未指定時は固定の安全な既定色を使う。
- 画像読込エラー時は既存 `handleImageLoadError` によりURLを破棄し、フォールバックカードへ切り替える。
- 夢本文は引き続きカードDOMと保存PNGに含めない。

## Files

- Modify: `backend/app/controllers/dreams_controller.rb`
- Modify: `backend/spec/requests/dreams_spec.rb`
- Modify: `frontend/app/components/DreamShareCard.tsx`
- Modify: `frontend/__tests__/components/DreamShareCard.test.tsx`
- Modify: `frontend/app/dream/[id]/page.tsx`
- Modify: `frontend/__tests__/components/DreamDetailPage.test.tsx`

## Task 1: 夢詳細APIに軽量プロフィールを追加

### Step 1: 失敗するrequest specを書く

`backend/spec/requests/dreams_spec.rb` の `describe 'GET /dreams/:id'` に、同じユーザーのプロフィールを明示した夢を作るケースを追加する。

- `authenticated_get("/dreams/#{dream.id}", user)` が `200` を返す。
- `dream_profile_id` がプロフィールIDと一致する。
- `dream_profile` は `id`, `name`, `avatar_emoji`, `color`, `active` の5項目だけを返す。
- 既存の「他人の夢は取得できない」テストは変更しない。
- DBの NOT NULL 制約と矛盾する `dream_profile: nil` ケースは作らない。

Run:

```bash
docker compose run --rm backend-test bundle exec rspec spec/requests/dreams_spec.rb
```

Expected: 新しい `dream_profile` expectation が失敗する。

### Step 2: `show` のJSON includeを既存定義へ揃える

`backend/app/controllers/dreams_controller.rb` の `show` を次の契約へ変更する。

```ruby
include: {
  emotions: {},
  dream_profile: dream_profile_json_options
}
```

新しいserializer helperは作らず、`index` / `by_month_index` と同じ `dream_profile_json_options` を再利用する。

### Step 3: backend回帰確認

Run:

```bash
docker compose run --rm backend-test bundle exec rspec spec/requests/dreams_spec.rb
```

Expected: PASS。プロフィール情報と既存の認可・一覧・月別取得がすべて緑。

## Task 2: DreamShareCardをプロフィール・画像なし対応にする

### Step 1: コンポーネント契約の失敗テストを追加

`frontend/__tests__/components/DreamShareCard.test.tsx` に次を追加する。

- `profileName="ねこさん"`, `profileEmoji="🐱"`, `profileColor="#f97316"` でプロフィールチップがカード内に表示される。
- profile props未指定ではプロフィールチップを描画しない。
- `imageUrl={null}` では `<img>` を描画せず、`data-testid="dream-share-card-fallback"` と既定または指定アバターを表示する。
- `imageUrl={null}` でも保存ボタンから `toPng` に到達し、画像proxyへのfetchを行わない。
- 既存のHTTPS、data URL、不正scheme、iOS共有、二重保存防止テストは残す。

Run:

```bash
cd frontend && npx jest __tests__/components/DreamShareCard.test.tsx
```

Expected: optional propsとフォールバックが未実装のためFAIL。

### Step 2: propsと表示を後方互換で拡張

`frontend/app/components/DreamShareCard.tsx` を以下の契約にする。

- `imageUrl?: string | null`
- `profileName?: string`
- `profileEmoji?: string`
- `profileColor?: string`
- 画像ありは既存 `<Image>` をそのまま使う。
- 画像なしは同じ `aspect-square` 領域に、薄いプロフィール色の背景、大きなアバター、短い補助文を表示する。
- プロフィールチップはカード本体内、ブランド行と日付・タイトルの間に置く。
- 長い名前は `min-w-0`, `max-w-full`, `truncate` でカード幅を押し広げない。
- プロフィール名がない場合はチップを省略し、フォールバック画像には既定絵文字を使う。

### Step 3: 保存処理をoptional URLに対応

- コンポーネント先頭の無条件 `proxyUrl` 計算を削除する。
- `if (img && imageUrl)` で型と実行条件を同時に絞る。
- HTTPSの場合だけ、その分岐内でproxy URLを組み立てる。
- 画像なしでは差し替え処理をスキップして `toPng(card, { pixelRatio: 2 })` へ進む。
- 既存の安全なdata URL判定、不正scheme拒否、`img.src` 復元、object URL解放は維持する。

### Step 4: コンポーネント回帰確認

Run:

```bash
cd frontend && npx jest __tests__/components/DreamShareCard.test.tsx
```

Expected: 新規・既存ケースがすべてPASS。

## Task 3: 夢詳細ページでカードを常時表示

### Step 1: ページ統合の失敗テストを追加

`frontend/__tests__/components/DreamDetailPage.test.tsx` に次を追加する。

- `generated_image_url` がない夢でも `dream-share-card` とフォールバックが表示される。
- `dream.dream_profile` の名前・絵文字がカード内に表示される。
- AI画像ありの既存ケースでは画像が1枚だけ表示される。
- `<img>` のerrorを発火すると既存エラー文が表示され、フォールバックへ切り替わる。
- 夢本文がカード内に入らない既存テストは残す。

Run:

```bash
cd frontend && npx jest __tests__/components/DreamDetailPage.test.tsx
```

Expected: 画像なしではカードが未描画のためFAIL。

### Step 2: 画像有無による大分岐を整理

`frontend/app/dream/[id]/page.tsx` で `DreamShareCard` を常時描画し、次を渡す。

```tsx
imageUrl={generatedImageUrl}
profileName={dream.dream_profile?.name}
profileEmoji={dream.dream_profile?.avatar_emoji}
profileColor={dream.dream_profile?.color}
```

画像生成ボタンはカード下に残し、状態により既存の「画像を生成する」または「描き直す」を表示する。`imageError`, `imageVerificationRequired`, `imageQuota`, `isGeneratingImage` の既存表示と制御は維持する。

### Step 3: 期限切れ画像のフォールバックを確認

既存 `handleImageLoadError` が `setGeneratedImageUrl(null)` を呼ぶ契約を変えない。これにより画像エラー後に同じカード領域がフォールバックへ再描画され、再生成ボタンも利用可能なままになることをページテストで確認する。

### Step 4: ページ統合テストを再実行

Run:

```bash
cd frontend && npx jest __tests__/components/DreamDetailPage.test.tsx
```

Expected: PASS。

## Task 4: 全体検証

### Step 1: 対象フロントテスト

```bash
cd frontend && npx jest __tests__/components/DreamShareCard.test.tsx __tests__/components/DreamDetailPage.test.tsx
```

### Step 2: フロント全体と型検査

```bash
cd frontend && npx jest
cd frontend && npx tsc --noEmit
```

Expected: 既存スイートを含めてPASS、新規型エラーなし。

### Step 3: backend対象spec

```bash
docker compose run --rm backend-test bundle exec rspec spec/requests/dreams_spec.rb
```

Expected: PASS。

### Step 4: 静的差分確認

```bash
git diff --check
git status --short
```

変更が計画対象6ファイルと設計・計画ドキュメントだけであることを確認する。

### Step 5: 手動QA

- AI画像あり: プロフィールチップ、保存、描き直し導線を確認。
- AI画像なし: フォールバック、保存、画像生成導線を確認。
- 期限切れ画像: エラー文とフォールバックへの切替を確認。
- 375px幅: 長いプロフィール名・夢タイトルが横にはみ出さないことを確認。
- 保存PNG: プロフィール、タイトル、感情タグが入り、夢本文や操作ボタンが入らないことを確認。

## Done Criteria

- `GET /dreams/:id` が認可済み夢の軽量プロフィールを返す。
- 画像の有無・読込成否にかかわらず、夢詳細に保存可能なカードが1枚表示される。
- プロフィール識別がカードとPNGに含まれる。
- 既存の画像保存、iOS共有、リンクコピー、画像生成導線が後退していない。
- backend request spec、フロントJest、TypeScript検査、375px手動QAが完了している。
