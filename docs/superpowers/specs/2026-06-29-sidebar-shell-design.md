# デスクトップ・サイドバー（redesign-code STEP 4・サイドバー先行）設計仕様

- 日付: 2026-06-29
- 対象: YumeTree フロントエンド（Next.js 16 + Tailwind v4 + lucide-react）
- 出典: `~/Downloads/redesign-code/web/Sidebar.tsx` / `AppShell.tsx`（改善① ナビ）
- 位置づけ: redesign-code STEP 4。**「サイドバー先行」スコープ**（ユーザー選択）。完全版AppShell（route group・右レール・ページ別トップバー）は最重量・高リスクのため見送り、左サイドバーだけを骨格に足す。
- 方針: 提示層のみ。森の中身・認証ロジック・ルーティングには触れない。公開ページ/モバイルは非破壊。

## 0. 背景と核心の判断

今のシェルは「全画面の上に横長Header＋下にBottomTabBar(モバイル)」。ここに左サイドバーを足すと**PCでヘッダーのナビとサイドバーのナビが二重**になる。→ **PC(lg+)・ログイン時は、Headerをサイドバーに置き換える**（サイドバーが logo＋ナビ＋ユーザー＋テーマ＋ログアウトを全部持つ）。公開ページ・モバイル・未ログインでは従来どおりHeader表示・サイドバー非表示。

判断機構は #3a と同じ「**認証=JS / レスポンシブ=CSS**」: サイドバーが表示時に `body.has-sidebar` を付け、CSS で lg+ かつ has-sidebar のとき Header を隠す。

## 1. コンポーネント仕様

### 1.1 新規 `app/components/Sidebar.tsx`（client）
- 表示条件: `useAuth().isLoggedIn` が真のときのみ。`hidden lg:flex`（PCのみ）。未ログインは `return null`。
- 構成（参照を実コードベースに適応）:
  - ロゴ（🌙 ユメツリー → /home）
  - ナビ: **ホーム**(/home, Home) / **さがす**(`useCommandPalette().open()`＋⌘Kヒント) / **夢の森**(/forest, Trees) / **マイ夢**(/my-dreams, Moon) / **設定**(/settings, Settings)。
    - 参照の「きもち」(/insights)は **STEP 5 未実装のため出さない**（STEP 5で追加）。
    - アクティブ判定は `usePathname` の startsWith（既存パターン）。`aria-current="page"`。
  - 下部: ユーザーカード（頭文字アバター＋名前＋プラン）＋ **テーマ切替(`ThemeToggle`再利用)** ＋ **ログアウト(`useAuth().logout`)**。
- 既存トークン（`bg-card`/`border-border`/`text-primary`/`bg-primary/10`/`text-muted-foreground`）でダーク自動対応。新色なし。
- 表示時に `document.body.classList.add("has-sidebar")`、アンマウント/未ログインで `remove`（#3aの`has-bottom-nav`と同型・フックは早期returnの前）。

### 1.2 `app/layout.tsx`（骨格をflex-row化）
- `<CommandPaletteProvider>` 内を **横並び**に: `<div class="flex min-h-screen">` の中に `<Sidebar />` ＋ 「Header＋main＋Footer の縦カラム」。
- **横paddingの移動**: 現状 `body` に付く `px-4 sm:px-6 lg:px-8` を**メインカラム側へ移す**（サイドバーは端まで `border-r`。bodyはpaddingなしのflex行）。公開ページ（サイドバーnull）でも従来と同じ単一カラム＋paddingになることを保証。
- `BottomTabBar`/`PendingDreamsMonitor` は従来位置。

### 1.3 `app/Header.tsx` / `app/globals.css`（PCで隠す）
- `Header` の `<header>` に目印 `data-app-header` を付与。
- `globals.css` に追加: `@media (min-width: 1024px) { body.has-sidebar [data-app-header] { display: none; } }`。
- → lg+ かつログイン時のみHeaderが消え、サイドバーが代替。公開/モバイル/未ログインは Header 表示のまま。

## 2. テスト方針（TDD・component render）

`@testing-library/react` + jest（`useAuth`/`usePathname`/`useCommandPalette` をモック）。
- **Sidebar**: 未ログインで `null`。ログイン時に ホーム/夢の森/マイ夢/設定 のリンクと「さがす」「ログアウト」が描画される。`usePathname="/forest"` で 夢の森 が `aria-current="page"`。表示時 `body` に `has-sidebar` 付与・アンマウントで除去。
- **globals.css**（#0/#3aと同様のコンテンツ回帰）: `body.has-sidebar` ＋ `data-app-header` ＋ `min-width: 1024px` の規則がある。
- 既存スイートが緑のまま。

## 3. 検証方針

- ゲート: `yarn jest` 全緑 + `yarn build` 成功（既存 forest tsc は無関係）。
- **preview目視（最重要・非破壊確認）**:
  - 公開 `/login`（未ログイン・PC幅）: **サイドバー非表示・Header従来どおり・レイアウト崩れなし**。
  - モバイル幅: サイドバー非表示・ボトムバー（ログイン時）・Header従来どおり。
  - `body.has-sidebar` が公開/未ログインで**付かない**こと（authゲート）。
  - 認証時のサイドバー表示・Header非表示(lg+)は component test ＋手動QA。

## 4. 成果物と境界

**触る**: 新規 `Sidebar.tsx` / `app/layout.tsx`（flex-row＋padding移動＋Sidebarマウント）/ `app/Header.tsx`（`data-app-header`）/ `app/globals.css`（has-sidebar規則）/ 新規テスト。

**触らない（後続へ）**: 右レール・ページ別トップバー・AppShell per-page（STEP 4b）/ `/insights`（STEP 5）/ `AuthNav`の中身（モバイルではそのまま使う。lg+で隠れるのはHeader丸ごと）/ 森・認証ロジック・Stripe・DB。

## 5. リスクと注意

1. **layout.tsx は全画面共通**。flex-row化とpadding移動は公開ページにも及ぶ→ preview で公開/モバイルの非破壊を必ず確認。サイドバー/Header隠しは auth＋lg ゲートで、未ログイン/モバイルは現状維持。
2. `data-app-header` を隠すCSSは**lg+ かつ has-sidebar** に限定（`@media`＋body class）。他の `header` 要素に影響しないよう属性セレクタで限定。
3. サイドバーは `h-screen sticky top-0` 等で全高固定。スクロール時の挙動を確認。
4. テーマ切替・ログアウトをサイドバーに移すことで、PCでHeaderが消えても操作を失わない。
