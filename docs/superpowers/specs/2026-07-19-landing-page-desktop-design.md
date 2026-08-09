# ランディングページ（⑥）デスクトップ改善 設計仕様

## 背景

Claude Design MCP経由の「YumeTree Web改善提案.dc.html」ハンドオフは全10画面を提案していたが、実装コードを一切読まずに書かれたものであり、既に別セッションで①②③④⑤⑦⑨⑩は既存実装済み、⑧は意図的にスコープ変更済みであることが確認された。唯一未対応だったのが⑥ランディングページ（`frontend/app/components/LandingPage.tsx`）である。

同ページは2026-05-17（PR #277「LP/FAQをYumeTree Phase 2向けに改善」）が最終更新で、今回のデスクトップ改善提案とは無関係の古い実装のままだった。`lg:`のレスポンシブ指定は2箇所（見出し文字サイズ・機能グリッド列数）のみで、提案にある「大型ヒーロー＋機能グリッド」のhifiデザインとは一致していない。

ハンドオフの`redesign-code/web/landing-page.tsx`（`LandingHero`＋`FeatureGrid`）を精読した結果、以下の問題が見つかった（過去の`auth-page.tsx`ハンドオフと同種の問題）：
- 「50,000+ 記録された夢」「4.8★ アプリ評価」等の**未検証の統計**が含まれる
- ヒーロー内に独自`<nav>`があり、既存のグローバル`Header`（`AuthNav`・`ThemeToggle`・`CommandPaletteTrigger`を含む）と**重複**する
- ブランド表記が「ユメツリー」（公開名は「YumeTree」、PR #276で統一済み）
- CTA遷移先が`/register`直行（現行の主CTAは`/trial`＝アカウント不要のおためし体験という既存のプロダクト判断）

そのため、ハンドオフのビジュアル言語（夜空グラデーションヒーロー・機能グリッド構造）は採用しつつ、上記の問題は除外し、既存の正しい実装（認証リダイレクト・Product Proof・FAQ・Final CTA・Tech Stack・`MorpheusGuideLanding`）を安全に温存する形で統合する。

## スコープ

**含む:** `/`（`app/page.tsx` → `LandingPage.tsx`）の全セクションのデスクトップ・モバイル双方のレイアウト再設計。

**含まない:** 他の9画面（既に対応済み）、`app/trial/page.tsx`以下の実際のおためし体験フロー自体、バックエンド変更。

## 現状の実装（変更の起点）

`frontend/app/components/LandingPage.tsx`（445行、単一ファイル）は以下6セクションを持つ:
1. Hero（`<h1>YumeTree / モルペウスと育てるAI夢ノート</h1>`、CTA「今朝の夢を入れてみる」→`/trial`）
2. Product Proof（入力→AI分析→感情タグの3ステップ実演、縦積み）
3. Benefits（4つの価値、`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`）
4. Final CTA（「今夜の夢が、明日の気づきになる。」、CTA「無料で体験する」→`/trial`、補助リンク`/register`・`/login`）
5. FAQ（8項目、`dl/dt/dd`＋`aria-expanded`アコーディオン、医療診断ではない旨・非公開である旨を含む）
6. Tech Stack（10個の技術チップ）

末尾に`<MorpheusGuideLanding />`（固定位置の吹き出し、`app/components/MorpheusGuide.tsx:119-129`）。

認証済みユーザーは`useEffect`で`/home`へ`router.replace`する既存ロジックを持つ（`authStatus === "authenticated"`時）。

`app/layout.tsx`のグローバル`metadata`（title: "YumeTree | モルペウスと育てるAI夢ノート"、description等）とグローバル`Header`（`app/Header.tsx` — `HeaderLogo`・`AuthNav`・`CommandPaletteTrigger`・`ThemeToggle`）はランディングページにも適用される。

既存E2E: `e2e/smoke.spec.ts`はタイトル正規表現`/YumeTree|AI夢ノート/i`とログインリンク/ボタンの可視性のみを検証（LP本文の文言に非依存）。`e2e/trial-flow.spec.ts`は`/trial`ページ自体を検証し、LPには依存しない。既存LandingPageのユニットテストは存在しない。

## アーキテクチャ

森機能（`app/components/forest/`）で確立した「1ファイル1責務」パターンに倣い、`LandingPage.tsx`をセクションごとのコンポーネントに分割する。`LandingPage.tsx`自体は認証リダイレクト判定＋6セクションの組み立てのみを担う薄いオーケストレーターにする。

### 新規ファイル

| ファイル | 役割 |
|---|---|
| `app/components/landing/LandingHero.tsx` | ヒーロー（`<h1>`を含む唯一のセクション、夜空固定背景） |
| `app/components/landing/LandingProductProof.tsx` | 3ステップ実演（既存の中身、レイアウトのみ変更） |
| `app/components/landing/LandingFeatureGrid.tsx` | 機能グリッド（既存Benefitsを置換） |
| `app/components/landing/LandingFinalCta.tsx` | 締めのCTA（既存のまま） |
| `app/components/landing/LandingFaq.tsx` | FAQ（既存8項目のまま） |
| `app/components/landing/LandingTechStack.tsx` | 技術スタック（既存のまま） |

### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `app/components/LandingPage.tsx` | 6コンポーネントの組み立て＋認証リダイレクトのみに縮小 |

### 変更しないファイル（確認済み）

`app/page.tsx`、`app/layout.tsx`（metadata）、`app/Header.tsx`、`app/components/MorpheusGuide.tsx`、`app/globals.css`。

## セクション別設計

### 1. Hero（`LandingHero.tsx`）

**役割:** 第一印象と主CTA。サイト唯一の`<h1>`を持つ（SEO上維持必須）。

**背景:** ライト/ダークモードに関わらず**常に夜空固定**（`AuthVisualPanel`・森キャンバスと同じ「世界観パネル」方式、ユーザー承認済み）。`bg-gradient-to-br from-indigo-950 via-slate-900 to-sky-950`＋星の`radial-gradient`背景（`AuthVisualPanel.tsx`の実装パターンを踏襲）。

**レイアウト:**
- デスクトップ（`lg:`以上）: `lg:flex-row`で左＝コピー、右＝モルペウス大型ビジュアルの2カラム
- モバイル（`lg`未満）: モルペウス画像→見出し→本文→CTAの縦積み（現行の配置を維持）

**コピー（現行から変更なし、SEO保持のため）:**
- h1: 「YumeTree」＋「モルペウスと育てるAI夢ノート」
- 本文4行: 現行のコピーをそのまま使用
- 主CTA: 「今朝の夢を入れてみる」→ `/trial`
- 補助リンク（新規・任意）: 「30秒でわかる」→ `#features`（`LandingFeatureGrid`のセクションIDへのページ内アンカー）

**削除する要素:** 「50,000+ 記録された夢」「4.8★ アプリ評価」等の統計行。代わりに「完全 非公開」の一言バッジのみ残す（これは検証可能な仕様であり、統計ではない）。

**採用しない要素:** ハンドオフ独自の`<nav>`（グローバル`Header`と重複するため）。

**ナビ動線の確認:** `layout.tsx`は既に`Sidebar`・`Header`（`AuthNav`にログイン/登録リンクを含む）をグローバル表示しており、LP専用ナビは不要。

### 2. Product Proof（`LandingProductProof.tsx`）

**役割:** 「入力→AI分析→感情タグ」の実際の使用感を先に見せる。**コピー・アイコン・配色は既存のまま変更しない**（実際の挙動を表す正確な内容のため）。

**レイアウト:**
- デスクトップ（`lg:`以上）: 3ステップを横並び（→でつなぐ）
- モバイル: 現行の縦積みを維持

**テーマ:** 既存の`bg-slate-100/80 dark:bg-slate-800/40`等のテーマ追従クラスをそのまま使用。

### 3. Feature Grid（`LandingFeatureGrid.tsx`、既存Benefitsを置換）

**役割:** 実在する機能を一覧で見せる。`id="features"`を持ち、Heroの「30秒でわかる」アンカー先になる。

**レイアウト:** `lg:grid-cols-3`（2段×3列）、`sm:grid-cols-2`、モバイル1列。

**コピー案（5機能＋プライバシー強調カードの計6セル、すべて実在機能）:**

| # | 見出し | 本文 | アイコン |
|---|---|---|---|
| 1 | すぐ残せる | テキストでも声でも。起きた瞬間の記憶を、消える前にキャッチする。 | `Mic` |
| 2 | 意味が返る | AIが夢をやさしい言葉で解釈。感情タグで、自分の気持ちに名前がつく。 | `Brain` |
| 3 | 感情の可視化 | 感情タグとムードカレンダーで、心の移り変わりをひと目で。 | `TrendingUp` |
| 4 | 夢を画像に | 記録した夢をもとに、AIが夢の世界をビジュアルで生成。言葉にできない雰囲気を形に残す。 | `ImageIcon` |
| 5 | 夢の森が育つ | 記録するたびに木が育つ。続けるほど、あなただけの森が広がっていく。 | `Trees` |
| 6（強調カード） | プライベート | 記録した夢は自分だけに見える。ランキングや公開機能はなく、安心して本音を残せる。 | `Lock` |

5番目「夢の森が育つ」は、このセッションで`/forest`のデスクトップ化（PR #435）まで完成した実在機能であるため新規追加する。1〜4・6は既存Benefitsの文言をほぼ踏襲する。

**テーマ:** `bg-card`/`border-border`/`text-card-foreground`等、既存のテーマトークンをそのまま使用（Heroと異なりテーマ追従）。

### 4. Final CTA（`LandingFinalCta.tsx`）

**変更なし。** 既存コピー（「今夜の夢が、明日の気づきになる。」等）・`MorpheusImage variant="reward"`・主CTA「無料で体験する」→`/trial`・補助リンク`/register`・`/login`をそのまま維持。コンテナ幅のみ広いビューポート向けに微調整可（構造変更はしない）。

### 5. FAQ（`LandingFaq.tsx`）

**役割:** 医療診断ではない旨・非公開である旨などの重要な製品情報を維持する（失ってはならない既存資産）。

**レイアウト:**
- デスクトップ（`lg:`以上）: `lg:grid-cols-2`（4問×2列）
- モバイル: 現行の縦積みアコーディオンを維持

**コピー:** 既存8項目（`FAQ_ITEMS`）を一字一句変更しない。

**アクセシビリティ:** `dl/dt/dd`＋`button aria-expanded`の既存パターンをそのまま維持。2列グリッドにしてもDOM順（1〜8）は変えず、読み上げ順・Tab順は現行のまま。

### 6. Tech Stack（`LandingTechStack.tsx`）

**変更なし。** 既存10個の技術チップ（Next.js, React, TypeScript, Tailwind CSS, Ruby on Rails, PostgreSQL, OpenAI API, Stripe, Vercel, Render）をそのまま、コンテナ幅のみ調整可。

## ライト／ダークモードの扱い

| セクション | 扱い |
|---|---|
| Hero | 常に夜空固定（テーマ非追従、世界観パネル方式） |
| Product Proof / Feature Grid / Final CTA / FAQ / Tech Stack | 既存の`bg-background`/`bg-card`/`dark:`トークンをそのまま踏襲（`next-themes`のトグルに追従、新規ロジック不要） |

## アクセシビリティ

- `<h1>`はHeroに1つのみ（現行文言を維持、SEO保持）
- 装飾要素（星の背景、円形ブラー等）は`aria-hidden="true"`
- フォーカスリングは既存のデザイントークン（PR #394 デザインシステム基盤）をそのまま使用、新規スタイルは追加しない
- `prefers-reduced-motion`対応: グローバルCSS（`globals.css:505`）はCSSキーフレーム（`morpheus-float`等）のみを無効化するため、framer-motionの`initial`/`animate`/`whileInView`プロパティは各セクションで`useReducedMotion()`（`framer-motion`）による明示ガードを追加する。`ForestScene.tsx`・`DreamPreviewModal`（`forest/[profileId]/page.tsx`内）で既に使われている`const reduceMotion = useReducedMotion(); animate={reduceMotion ? undefined : {...}}`パターンを踏襲する

## エラーハンドリング・エッジケース

| ケース | 挙動 |
|---|---|
| 認証済みユーザーがLPへアクセス | 既存の`useEffect`（`authStatus === "authenticated"`→`router.replace("/home")`）をそのまま維持。`LandingPage.tsx`のトップレベルに残す |
| `authStatus === "checking"`中 | 既存のローディング表示（`animate-pulse`ドット）をそのまま維持 |
| JSが無効/読み込み中の初期表示 | Heroの`<h1>`とCTAリンクはサーバーレンダリング時点で存在（`motion`の`initial`状態は`opacity:0`だが要素自体はDOMに存在し、SEOクローラーはコンテンツを取得可能。現行実装と同じ挙動を維持） |

## テスト方針

**新規ユニットテスト:**
- `__tests__/components/landing/LandingHero.test.tsx` — h1文言の表示、主CTAが`/trial`を指すこと、コンポーネント内に`<nav>`要素が存在しないこと（グローバルHeaderとの重複防止の直接的な検証）
- `__tests__/components/landing/LandingFeatureGrid.test.tsx` — 5機能＋プライバシー強調カードの見出し文言が表示されること、統計数値（例: `/50,000|4\.8★/`のようなパターン）が存在しないこと
- `__tests__/components/landing/LandingFaq.test.tsx` — 8問すべての質問文が表示されること、質問クリックで`aria-expanded`が切り替わり回答が表示/非表示になること
- `__tests__/app/LandingPage.test.tsx`（新規、既存テストなし） — `authStatus === "authenticated"`で`/home`へ`router.replace`が呼ばれること、`authStatus === "unauthenticated"`ではh1と6セクション＋`MorpheusGuideLanding`が揃って描画されること（各セクションコンポーネントはモックし、配線のみ検証する統合テスト）

**既存テストへの影響確認:**
- `e2e/smoke.spec.ts`・`e2e/trial-flow.spec.ts` — 事前調査によりLPの具体的な文言・構造に依存しないことを確認済み。無修正で引き続きパスすることを実装後に再確認する

**手動ブラウザ確認:** 375px・768px・1440pxの3幅、ライト/ダークモード双方でスクリーンショット確認。Heroが夜空固定で表示され、他セクションがテーマ追従することを目視確認する。
