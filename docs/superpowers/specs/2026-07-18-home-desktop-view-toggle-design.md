# Home 夢一覧 グリッド／リスト表示切替 設計仕様

- 日付: 2026-07-18
- 対象: `frontend/app/home/page.tsx`、`frontend/app/components/DreamList.tsx`
- 起点: `origin/main` `6c0d8fd`（PR #429マージ済み）

## 1. 目的

`/home`へ一本化済みの夢一覧に、デスクトップ利用者が情報密度を選べる「グリッド／リスト」表示切替を追加する。

現行`DreamList`はすでに`auto-fill`と`minmax(280px, 1fr)`によるレスポンシブグリッドである。そのため新しいカードUIや専用一覧ページは作らず、現行グリッドを既定値として維持し、1列リスト表示を選べるようにする。

## 2. 決定事項

- 表示モードは`"grid" | "list"`の2種類。
- 初期値は常に`grid`。現行表示を変えない。
- `/home`がstateを所有し、`DreamList`へ`viewMode` propとして渡す。
- 切替UIは夢一覧の直前に配置し、`md`以上かつ夢が1件以上あるときだけ表示する。
- グリッドは現行クラスを維持する。
- リストは1列の縦積みとし、`DreamCard`本体は変更しない。
- 選択状態はセッション内のReact stateのみ。localStorageやURLには保存しない。
- ローディング、エラー、空状態では切替UIを表示しない。

## 3. UI・アクセシビリティ

- `LayoutGrid`と`List`（lucide-react）を使用する。
- 2ボタンを`role="group"`、`aria-label="夢の表示形式"`でまとめる。
- 各ボタンに`aria-label`（`グリッド表示`／`リスト表示`）と`aria-pressed`を付ける。
- 選択中は`bg-primary/10 text-primary`、未選択は`text-muted-foreground`。
- `focus-visible`リングと44px相当の操作領域を確保する。
- モバイルでは現行グリッドが実質1列になるため、切替UIを隠して操作を増やさない。

## 4. コンポーネント境界

### `home/page.tsx`

- `DreamViewMode` stateを追加する。
- 一覧直前に切替UIを描画する。
- `DreamList`へ`viewMode`を渡す。

### `DreamList.tsx`

- `viewMode?: "grid" | "list"`を追加し、既定値を`grid`にする。
- データ、並び順、空状態の分岐は変更しない。
- コンテナクラスだけを表示モードで切り替える。

## 5. テスト

- `DreamList`のprop省略時にグリッドになる。
- `viewMode="list"`で1列レイアウトになる。
- どちらの表示でも入力順とカード内容を維持する。
- `/home`の初期状態はグリッドボタンが選択済み。
- リストボタン操作で`DreamList`へ`list`が渡る。
- 空状態・検索・プロフィールフィルターの既存テストを回帰確認する。

## 6. スコープ外

- `AppShell`新設
- `/dreams`新設
- `/my-dreams`変更
- `SearchBar`、`ProfileFilterChips`、`DreamCard`の変更
- 表示設定の永続化
- 取得API、認証、決済、分析処理の変更

## 7. 作業ツリー方針

主worktreeには未完了の`lg:`→`2xl:`変更があるため触らない。`origin/main` `6c0d8fd`から作成した専用worktree、ブランチ`codex/home-desktop-view-toggle`だけで実装する。
