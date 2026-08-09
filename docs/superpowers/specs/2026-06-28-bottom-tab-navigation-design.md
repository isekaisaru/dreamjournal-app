# ボトムタブ・ナビゲーション（サブPJ #2）設計仕様

- 日付: 2026-06-28
- 対象: YumeTree フロントエンド（Next.js 16 App Router + Tailwind v4 + framer-motion）
- 前提: #0（PR #394）/ #1（PR #395）マージ済み。`--morpheus-hero` / `--glow-active` / `animate-moon-pulse` / `animate-morpheus-float` 利用可能。
- 位置づけ: 全画面リデザインの#2。アプリのシェル（ナビ）をモバイル先行で整え、#3で各画面を流し込む土台にする。
- スコープ判断: タブ＝**おうち/もり/[＋きろくFAB]/マイ夢/設定**、デスクトップは**現行Header維持・ボトムバーはモバイルのみ**（ユーザー選択）。

## 0. 背景と現状

現行ナビは上部 `Header`（`HeaderLogo` + `AuthNav` + `ThemeToggle`）。`AuthNav`（認証時）は左[おうち/home・もり/forest・きろくする(`DreamEntryLauncher`)]＋右[保護者メニュー/settings・ログアウト]で、モバイルでは縦積みになり背が高い。`my-dreams` 等はトップナビに無い。子ども向けのやさしい語彙（おうち/もり/きろく）を踏襲する。

`DreamEntryLauncher`（記録モーダル：マイク/手書き、`buttonClassName` で見た目差し替え可）が既にあり、これを**中央FABの中身として再利用**する。

## 1. 設計原則

1. **提示層のみ**: 認証・ルーティング・Stripe・DBのロジックには触れない。新規ナビは表示と既存リンク/既存ランチャーへの導線のみ。
2. **デスクトップ不変**: `md` 以上は現行Headerのまま。ボトムバーは `md:hidden` でモバイル専用。デスクトップの見た目はピクセル等価を保つ。
3. **認証連動**: ボトムバーは `isLoggedIn` の時だけ表示。`authStatus==="checking"` および未ログインでは描画しない（公開ページ landing/login/trial に出さない）。
4. **再利用**: FABは既存 `DreamEntryLauncher`、アクティブ判定は `AuthNav` と同じ `usePathname` ロジックを踏襲。トークン（色/グロー）は#0準拠で新規ハードコードを足さない。

## 2. コンポーネント仕様

### 2.1 新規 `BottomTabBar`（`app/components/BottomTabBar.tsx`、client）

- 表示条件: `useAuth()` の `isLoggedIn` が真のときのみ。`authStatus==="checking"` / 未ログインは `return null`。
- レイアウト: `fixed inset-x-0 bottom-0 z-40 md:hidden`、`bg-background/95 backdrop-blur border-t border-border`、iOSセーフエリア対応 `pb-[env(safe-area-inset-bottom)]`。横並び5スロット（中央FABを浮かせる）。
- タブ（左2・右2、中央FAB）:

  | スロット | href | ラベル | アイコン(lucide) |
  |---|---|---|---|
  | 1 | `/home` | おうち | `House` |
  | 2 | `/forest` | もり | `Trees` |
  | 中央 | （FAB） | きろく | `DreamEntryLauncher`（円形・`Plus`/`Mic`） |
  | 3 | `/my-dreams` | マイ夢 | `Moon` |
  | 4 | `/settings` | 設定 | `Settings` |

- アクティブ判定: `pathname === href || (href !== "/" && pathname?.startsWith(href))`（`AuthNav` と同一）。アクティブ時は `text-primary`、非アクティブは `text-muted-foreground`。各タブは `Link` でアイコン＋極小ラベル（縦並び）。
- 中央FAB: `DreamEntryLauncher` を `buttonClassName` で円形（`h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg -mt-6`）に整形し、バー上端から少し浮かせる。`buttonLabel` は視覚的に隠し（`sr-only`）、アイコンのみ表示。アクセシブルラベルは「夢をきろくする」。
- アクセシビリティ: `<nav aria-label="メインナビゲーション">`。各リンクにラベルテキスト同梱。

### 2.2 `layout.tsx` への組み込み（`app/layout.tsx`）

- `<Footer />` / `<PendingDreamsMonitor />` と並べて `<BottomTabBar />` を追加。
- モバイルでコンテンツがバーに隠れないよう、本文ラッパに**モバイル限定の下パディング**を付与: 例 `main` を包む要素へ `pb-[calc(env(safe-area-inset-bottom)+4.5rem)] md:pb-0`。`md` 以上は `pb-0` でデスクトップ不変。
- `Header` / `AuthNav` は**今回変更しない**（モバイルの縦積みスリム化は将来#3/別PRの任意改善として残す）。

## 3. テスト方針（TDD・component render）

既存パターン（`@testing-library/react` + jest、`useAuth`/`usePathname` をモック）に従う。

- **BottomTabBar**:
  - 未ログイン（`isLoggedIn=false`）で `null`（何も描画しない）。
  - `authStatus==="checking"` で `null`。
  - ログイン時、`/home`・`/forest`・`/my-dreams`・`/settings` への4リンクと中央の記録FAB（`DreamEntryLauncher` 由来のボタン）が描画される。
  - `usePathname` が `/forest` のとき「もり」タブがアクティブ表示（`text-primary` 等の活性クラス）になる。
- 既存スイート（311件）が緑のまま。

## 4. 検証方針

- 完了ゲート: `yarn jest` 全緑 + `yarn build` 成功。
- **preview目視**:
  - 公開ページ `/login`（未認証）でボトムバーが**出ない**こと、モバイル幅でレイアウトが崩れないこと、デスクトップ幅でHeaderが従来どおりであることを確認（公開ページで検証可能な範囲）。
  - 認証済み画面でのバー表示・FAB・アクティブ状態は `isLoggedIn` 依存のため、**component testで担保**し、実機での発色/タップ感は認証済みpreview or 手動QAに委ねる（限界として明記）。

## 5. 成果物と境界

**#2で触る**: 新規 `BottomTabBar.tsx` / `app/layout.tsx`（マウント＋モバイル下パディング）/ 新規テスト。

**#2で触らない（後続へ）**:
- `Header` / `AuthNav` のリファクタ（モバイル縦積みスリム化）→ 任意・後続
- 各画面の中身 → #3
- 森画面 → #4
- 認証/ルーティング/Stripe/DBのロジック

**ドキュメント**: 本仕様書 + 実装プラン。

## 6. リスクと注意

1. `layout.tsx` は全画面共通。下パディングは**必ず `md:pb-0`** にしてデスクトップをピクセル不変に保つ。
2. 中央FABの `DreamEntryLauncher` はモーダルを開く。`fixed` バー内に置くと **stacking context / overlay のクリップ**が起きないか要確認（モーダルが `z-index`・portal で最前面に出ること）。問題があればFABはランチャーのトリガーのみをバーに置き、モーダル本体はバー外で描画する。
3. `isLoggedIn` 連動のため、ログアウト直後やトークン失効時にバーが即座に消えること（`AuthContext` 状態に追従）を確認。
4. 既存 `DreamRecorderFloating`（別の浮遊録音UI）との**役割・表示重複**に注意。重複して画面に2つ録音導線が出る場合は、#2では現状維持（重複解消は別途判断）とし、本PRで新たな重複を増やさない。
