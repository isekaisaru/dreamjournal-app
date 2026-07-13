# プロフィール別シェアカード（DreamShareCard プロフィール対応）設計仕様

- 日付: 2026-07-13
- 対象: YumeTree フロントエンド（Next.js 16 + Tailwind v4）＋ バックエンド（Rails 7.2, 最小追加）
- 位置づけ: `phase5-dream-profiles-design.md` の将来アイディア「プロフィール別シェアカード（『太郎の夢』としてシェアカードを生成）」。
  世界観MVP**第2弾**（第1弾は「今週のゆめニュース」PR #423）。

## 0. 方針・調査結果

**シェアカード機能自体は既に実装済み**。今回はゼロからの新規開発ではなく、既存 `DreamShareCard` の**プロフィール対応拡張**である。

調査で判明した現状:
- `frontend/app/components/DreamShareCard.tsx` が既に存在し、以下を実装済み（複数の修正コミットで枯れている）:
  - AI夢画像＋夢タイトル＋日付＋感情タグ＋YumeTreeブランドのカード表示
  - 「画像として保存」: `html-to-image` の `toPng`、`/api/image-proxy` 経由のCORS/tainted-canvas回避、iOS Web Share API、`<a download>` フォールバック
  - 「リンクをコピー」
  - 単体テスト `frontend/__tests__/components/DreamShareCard.test.tsx`（約490行）
- **欠けているのは「プロフィール別」の要素**: カードにプロフィールの名前・アバターが一切出ない（props に profile 情報がなく、`dream/[id]/page.tsx` からも渡していない）。
- **現状の制約**: カードは `generatedImageUrl` が存在する夢でしか表示されない（AI画像未生成の夢には共有カード自体が出ない）。
- 夢詳細API（`DreamsController#show`）は `dream_profile_id` のみ返し、**`dream_profile` オブジェクト（name/avatar_emoji/color）は返していない**。一方 `index` / `month` は既に `dream_profile_json_options`（`{ only: [:id, :name, :avatar_emoji, :color, :active] }`）で `dream_profile` を include 済み。
- `frontend/app/types.ts` の `Dream` 型は `dream_profile?: Pick<DreamProfile, "id"|"name"|"avatar_emoji"|"color"|"active"> | null` を既に定義済み。

→ **やること: (A) `show` に `dream_profile` include を1つ足す（`index` と同じ `dream_profile_json_options` を再利用）。(B) `DreamShareCard` にプロフィール識別と、AI画像なし時のフォールバック意匠を追加。(C) `dream/[id]/page.tsx` の配置を「画像あり時のみ」から常時表示へ整理。** 新規エンドポイント・migration・DBスキーマ変更・Stripe・OpenAI呼び出しの追加は無し。

## 1. スコープ（決定事項）

- 共有の仕組み: **画像ダウンロード（client完結）**。公開シェアURL・新規バックエンドエンドポイントは作らない（既存 `DreamShareCard` の方式を踏襲）。
- カードの主役: **1件の夢**（夢詳細画面から起動）。
- 広さ: **プロフィール対応 ＋ AI画像なしの夢にも対応**（画像がない夢もカード化・共有できるようにする）。
- プロフィールデータの取得元: **夢詳細API（`show`）に `dream_profile` を include**（フロントでの別取得はしない）。

## 2. バックエンド変更（最小・追加のみ）

`backend/app/controllers/dreams_controller.rb` の `show` アクションの `as_json` に、既存 `dream_profile_json_options` を使って `dream_profile` を include する。

現状:
```ruby
def show
  render json: @dream.as_json(
    only: [:id, :title, :created_at, :content, :analysis_json, :analysis_status, :analyzed_at, :generated_image_url, :dream_profile_id],
    include: :emotions
  )
end
```

変更後:
```ruby
def show
  render json: @dream.as_json(
    only: [:id, :title, :created_at, :content, :analysis_json, :analysis_status, :analyzed_at, :generated_image_url, :dream_profile_id],
    include: {
      emotions: {},
      dream_profile: dream_profile_json_options
    }
  )
end
```

- `dream_profile_json_options` は既存の private メソッド（`{ only: [:id, :name, :avatar_emoji, :color, :active] }`）をそのまま再利用（新しいシリアライズ定義を作らない）。
- `dream_profile_id` が NULL の夢（理論上は NOT NULL 化済みだが防御的に）や、アーカイブ済みプロフィールに属する夢でも安全に動く（`dream_profile` が nil のときは include が nil を返すだけ）。
- N+1 回避: `set_dream_and_authorize_user` は単一レコード取得なので `includes` 不要（1レコードの関連ロードは1クエリ追加のみ）。
- 認可: `show` は既に `set_dream_and_authorize_user` で current_user の夢に限定済み。`dream_profile` も同一ユーザーの所有物なので情報漏洩なし。

## 3. フロントエンド: `DreamShareCard` プロフィール対応

`frontend/app/components/DreamShareCard.tsx` を**後方互換を保って**拡張する（既存の保存/コピー/proxy ロジックは変更しない）。

### props 追加（すべて optional。既存呼び出し・既存テストを壊さない）
```ts
type DreamShareCardProps = {
  imageUrl?: string | null;   // 変更: 必須 → optional（AI画像なし対応）
  title: string;
  recordedAt: string;
  emotionLabels: string[];
  imageAlt: string;
  onImageError?: () => void;
  profileName?: string;       // 追加
  profileEmoji?: string;      // 追加（avatar_emoji）
  profileColor?: string;      // 追加（アクセント色）
};
```

### プロフィール識別の意匠
- カード本体（`<section ref={cardRef}>`）内、YumeTreeヘッダー行の下・日付/タイトルの近くに**プロフィールチップ**を追加: `{profileEmoji} {profileName}`。
- `profileColor` をチップの枠線/背景アクセントに使う（`color` は hex 文字列。`${profileColor}22` 等でごく薄い背景。6桁hex前提は既存 `ForestPreviewWidget` と同じ運用）。
- `profileName` / `profileEmoji` が未指定のときはチップを描画しない（後方互換）。
- 夢タイトル（`title`）はそのまま。プロフィールは別要素として添え、「誰の夢か」を明示する（例: チップ「🐱 ねこさん」＋タイトル「星空を走る夢」）。

### AI画像なしフォールバック意匠（`imageUrl` が空/未指定のとき）
- 現状の `<div className="relative aspect-square">` 内の `<Image>` を条件分岐する:
  - `imageUrl` あり → 従来通り `<Image>`（proxy 保存ロジックもそのまま）
  - `imageUrl` なし → **フォールバック意匠**: `profileColor` ベースのグラデーション背景＋中央に大きめ `avatar_emoji`（無ければ 🌙 等の既定絵文字）＋（任意で）夢タイトルの控えめ表示。写真がなくても「らしさ」が出る**静的CSS意匠**（新規AI生成は呼ばない＝課金・遅延ゼロ）。
- `handleSave` は既に `const img = card.querySelector("img"); if (img) {…}` とガードしているため、img が無い（フォールバック）ときは画像差し替えをスキップして `toPng(card)` に直行する。**保存ロジック本体の変更は不要**（この事実を実装時に確認する）。
- **`imageUrl` を optional 化することに伴う要注意点（実装時に必ず対処）**:
  - コンポーネント冒頭の `const proxyUrl = /api/image-proxy?url=${encodeURIComponent(imageUrl)}` は現在 `imageUrl` を無条件参照している。optional 化後は `imageUrl` がある場合のみ計算する（`handleSave` 内で算出、または `imageUrl ? … : undefined`）。
  - `handleSave` 内の `SAFE_DATA_PREFIXES.some((p) => imageUrl.startsWith(p))` と `imageUrl.startsWith("https://")` は `if (img)` ブロック内なので実行時は `imageUrl` が存在するが、TypeScript の型は narrowing が必要。`if (img && imageUrl)` などで明示的に絞る。

## 4. フロントエンド: `dream/[id]/page.tsx` の配置整理

現状はカードが `generatedImageUrl ?` の真ブランチでしか描画されない。AI画像なしの夢でもカードを出すため、次のように整理する:

- `DreamShareCard` を `generatedImageUrl` の有無に関わらず**常に描画**し、`imageUrl={generatedImageUrl}`（null可）と `profile*` props を渡す。
- profile props は `dream.dream_profile`（§2で include されるようになる）から渡す: `profileName={dream.dream_profile?.name}` / `profileEmoji={dream.dream_profile?.avatar_emoji}` / `profileColor={dream.dream_profile?.color}`。
- 「🎨 画像を生成する / 描き直す」ボタン（既存の `handleGenerateImage`・枚数表示・エラー表示）は**残す**。カードの下（または画像がないときはカード内フォールバックの近く）に配置し、ユーザーが引き続きAI画像を生成できるようにする。
- 既存の imageError / imageQuota 表示は維持する。

## 5. テスト方針

### バックエンド（RSpec request spec）
- `show` のレスポンスに `dream_profile`（id/name/avatar_emoji/color/active）が含まれることを検証する1ケースを追加（既存の dreams request spec があればそこへ）。
- `dream_profile` が nil の夢でも 200 で壊れないことを1ケース。
- Docker内で実行（`docker compose` の backend-test サービス。ホストRubyはgem未導入）。

### フロントエンド（既存 `DreamShareCard.test.tsx` を拡張）
既存の `DEFAULT_PROPS`・モック（`html-to-image`/`next/image`/`react-hot-toast`）はそのまま活かし、以下を追加:
1. `profileName`/`profileEmoji` を渡すとカードに「🐱 ねこさん」相当が表示される
2. profile props 未指定のとき、プロフィールチップが描画されない（後方互換）
3. `imageUrl` 未指定（フォールバック）のとき、`<img>` が描画されず、フォールバック意匠（大アバター等）が表示される
4. `imageUrl` 未指定でも「画像として保存」が `toPng` を呼べる（img 差し替えをスキップして保存に到達する）
- 既存の全テスト（約490行）が引き続き緑であることを確認（後方互換の担保）。

## 6. 検証方針

### 完成条件
1. `show` が `dream_profile` を返す（RSpec緑）
2. `DreamShareCard` がプロフィール識別を表示し、AI画像なしの夢でもカード生成・保存できる
3. `dream/[id]/page.tsx` でカードが画像有無に関わらず表示され、profile props が渡る
4. `yarn jest` 全緑 ＋ `tsc --noEmit` 新規型エラーなし ＋ backend RSpec 緑

### 手動QA（デプロイ後のスマホ実機）
- [ ] AI画像ありの夢: カードにプロフィールチップが出る／保存できる
- [ ] AI画像なしの夢: フォールバック意匠のカードが出る／保存できる
- [ ] スマホ幅でカードが横にはみ出さない・長いプロフィール名/夢タイトルで崩れない
- [ ] アーカイブ済みプロフィールの夢でもプロフィール名が出る
- [ ] 「画像を生成する」導線が引き続き機能する

## 7. 境界

**触る**: `backend/app/controllers/dreams_controller.rb`（`show` に include 1つ）/ `frontend/app/components/DreamShareCard.tsx`（props追加・意匠）/ `frontend/app/dream/[id]/page.tsx`（配置整理）/ テスト（既存拡張＋backend 1件）。

**触らない**: 新規エンドポイント・ルーティング・migration・DBスキーマ・Stripe・OpenAI API・認証ゲート・`DreamShareCard` の保存/コピー/proxy コアロジック・他の画面。公開シェアURL・別アカウント共有は今回のMVPスコープ外（将来 `shareable` フラグ案として温存）。
