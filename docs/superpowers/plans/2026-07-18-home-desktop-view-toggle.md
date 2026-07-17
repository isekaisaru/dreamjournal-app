# Home 夢一覧 グリッド／リスト表示切替 実装計画

**Goal:** `/home`の既存夢一覧に、現行グリッドを維持したまま1列リストへ切り替えられるデスクトップUIを追加する。

**Source spec:** `docs/superpowers/specs/2026-07-18-home-desktop-view-toggle-design.md`

## Task 1: `DreamList`を2レイアウト対応にする

対象:

- `frontend/app/components/DreamList.tsx`
- `frontend/__tests__/components/DreamList.test.js`

手順:

1. `DreamListProps`へ`viewMode?: "grid" | "list"`を追加する。
2. 既定値を`grid`にする。
3. 現行グリッドクラスと1列リストクラスを条件分岐する。
4. テストから判定できる`data-view-mode`をコンテナへ付ける。
5. グリッド既定値、リスト指定、入力順維持のテストを追加する。
6. `DreamList.test.js`を実行する。

## Task 2: `/home`へ切替UIを追加する

対象:

- `frontend/app/home/page.tsx`
- `frontend/__tests__/app/home/page.test.tsx`

手順:

1. `LayoutGrid`、`List`をimportする。
2. `DreamViewMode` stateを`grid`初期値で追加する。
3. `!loading && !errorMessage && dreams.length > 0`のとき、一覧直前に`md`以上の切替UIを表示する。
4. `DreamList`へ`viewMode`を渡す。
5. homeテストのDreamList mockで受け取ったmodeを可視化する。
6. 初期グリッドとリスト切替、ARIA状態をテストする。

## Task 3: 回帰検証

1. 対象Jestを実行する。
2. フロント全Jestを実行する。
3. `npm run build`を実行する。
4. `git diff --check`と対象外ファイルがないことを確認する。

## 完了条件

- 現行の既定表示に変化がない。
- デスクトップで1列リストへ切り替えられる。
- 検索・プロフィール絞り込み・空状態・カード遷移に回帰がない。
- AppShellや新規ルートを追加していない。
