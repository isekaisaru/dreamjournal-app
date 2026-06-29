# ⌘K コマンドパレット（redesign-code STEP 3）設計仕様

- 日付: 2026-06-29
- 対象: YumeTree フロントエンド（Next.js 16 + Tailwind v4 + lucide-react）
- 出典: `~/Downloads/redesign-code/web/CommandPalette.tsx`（改善② 検索・入力）
- 位置づけ: redesign-code STEP 3。検索・記録・移動を1ストロークで行うコマンドパレット。外部ライブラリ不要。
- 方針: 参照を**そのまま貼らず**、実ルート/認証/データ取得に合わせて適応。提示層のみ。森非タッチ。

## 0. 概要

`⌘K` / `Ctrl+K` でモーダルパレットを開き、入力で絞り込み、`↑↓` 選択・`Enter` 実行・`Esc` 閉じる。クイック操作（記録/移動）と「さいきんの ゆめ」（最近の夢へ移動）を提供する。

## 1. 適応の判断（参照→実コードベース）

1. **コマンドのルートを実在に合わせる**:
   - クイック操作: `新しい夢を記録`→`/dream/new` / `ホーム`→`/home` / `もり`→`/forest` / `マイ夢`→`/my-dreams` / `設定`→`/settings`。
   - 参照の `/insights`（きもちインサイト）は **STEP 5 で未実装のため今回は出さない**。音声モード(`/dream/new?mode=voice`)も実体がないため出さず、記録は `/dream/new` に集約。
   - さいきんの ゆめ: 最近の夢6件 → `/dream/{id}`。
2. **recentDreams の供給**: 参照は prop だが、`layout.tsx`（サーバー）からは夢データを渡せない。→ **パレットを初めて開いた時に遅延 fetch**（`apiClient.get<Dream[]>("/dreams")` の先頭6件）。セッション内キャッシュ。失敗時はクイック操作のみ表示（非致命）。
3. **認証ゲート**: コマンドは認証ページ前提。→ **`isLoggedIn` のときだけ** ⌘K リスナーとパレットを有効化（未ログイン/公開ページでは no-op、何も描画しない）。
4. **見える起動口**: ⌘K はデスクトップ操作。モバイルは既存導線（ボトムバー・検索）で足りる。→ **デスクトップ(md+)のヘッダーに小さな「⌘K 検索」ボタン**を1つ追加（`useCommandPalette().open()` を呼ぶ）。モバイルでは非表示。

## 2. コンポーネント仕様

### 2.1 `app/components/CommandPalette.tsx`（新規・client）
- `CommandPaletteProvider`（Context）: `open/close/toggle` を提供。内部で `useAuth()` を見て `isLoggedIn` 時のみ ⌘K リスナー＋パレットを有効化。`recentDreams` は open時に遅延fetch（自前state、外部propは不要）。
- `useCommandPalette(): { open; close; toggle }`（Provider外では no-op）。
- パレットUI（参照踏襲）: 入力欄（Search アイコン・esc kbd）、絞り込み（label部分一致）、`クイック操作`/`さいきんの ゆめ` のグループ表示、フッター（↑↓/↵/⌘K ヒント）。`role="dialog"` `aria-modal` `aria-label`、開いたら入力に focus、`↑↓`/`Enter`/`Esc` 操作。トークン（`bg-card`/`border-border`/`bg-primary/10` 等）でダーク自動対応。

### 2.2 マウントと起動口
- `app/layout.tsx`: `<Providers>` 内を `<CommandPaletteProvider>` でラップ（`Header`/`children`/`BottomTabBar` がパレットContext配下に入る）。Providerは未ログイン時は子をそのまま通すだけ（オーバーレイ非描画）。
- 起動口: `app/components/CommandPaletteTrigger.tsx`（新規・小）= `useCommandPalette().open()` を呼ぶ `hidden md:inline-flex` の検索ボタン。`Header` 内（`ThemeToggle` の近く）に配置。

## 3. テスト方針（TDD・component render）

`@testing-library/react` + jest。`useAuth`/`useRouter`/`apiClient` をモック。
- ログイン時、`⌘K`（metaKey+k）でパレットが開く。`Esc` で閉じる。
- 未ログイン時は `⌘K` で何も開かない。
- 入力で候補が絞り込まれる（label部分一致）。
- `Enter` で active コマンドの `router.push` が正しいルートに呼ばれる（例: 新しい夢を記録→`/dream/new`）。
- `useCommandPalette` を Provider 外で呼んでも no-op（落ちない）。
- 既存スイートが緑のまま。

## 4. 検証方針

- ゲート: `yarn jest` 全緑 + `yarn build` 成功（既存 forest tsc は無関係）。
- preview目視: 公開 `/login` では ⌘K で何も開かない・トリガーボタン非表示（認証ゲート確認）。認証時のパレット表示は component test で担保＋手動QA。

## 5. 成果物と境界

**触る**: `app/components/CommandPalette.tsx`（新規）/ `app/components/CommandPaletteTrigger.tsx`（新規）/ `app/layout.tsx`（Providerマウント）/ `app/Header.tsx`（トリガー配置）/ 新規テスト。

**触らない（後続へ）**: `/insights`（STEP 5）/ サイドバー・AppShell（STEP 4）/ 音声モーダルのパレット連携 / 認証/Stripe/DB/森。

## 6. リスクと注意

1. ⌘K の `keydown` リスナーはブラウザ既定（Chromeの検索バー等）と衝突しうるため `preventDefault`。入力中の `Esc`/`Enter`/矢印はパレット内 input の `onKeyDown` で処理。
2. `apiClient.get("/dreams")` の遅延fetchは open時のみ＋キャッシュ。失敗は握りつぶしてクイック操作のみ表示。
3. オーバーレイは `fixed inset-0 z-50`。`backdrop-blur` を持つが、内部に `position:fixed` の子を持たないため #2 のFABモーダルのような包含ブロック問題は無い（パレット自体が最前面モーダル）。
4. Provider を未ログインで描画しても副作用が無いこと（リスナー未登録・fetch未実行）を保証。
