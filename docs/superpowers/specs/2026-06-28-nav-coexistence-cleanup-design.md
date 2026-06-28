# ナビ共存とクリーンアップ（サブPJ #3a）設計仕様

- 日付: 2026-06-28
- 対象: YumeTree フロントエンド（Next.js 16 App Router + Tailwind v4 + framer-motion）
- 前提: #0(PR #394)/#1(PR #395) マージ済み。**#2(Draft PR #396, `BottomTabBar`) に依存**するため、本ブランチは `feat/bottom-tab-navigation` から切る（#2にスタック）。
- 位置づけ: 全画面リデザインの#3の最初のスライス。「ホームを世界観の参照画面に」の実体調査の結果、**ホームは#0/#1で既に世界観を満たしている**ため、#3aは(1)#2のバー導入で生じた固定吹き出しとの衝突解消（グローバル）と(2)死にコード除去にスコープする。
- スコープ判断: 衝突修正＝グローバル、死にコード＝今回削除（ユーザー選択）。

## 0. 背景（調査で判明した実態）

- ホームの記録導線は実際には2つ（ヒーロー内 `DreamEntryLauncher` ＝主CTA＋#2ボトムFAB＝常設）で過剰ではない。
- レビューが指摘した `DreamRecorderFloating`（`z-[9999]`）は**未マウントの死にコード**だった（後述）。
- 本当の問題は **固定 `MorpheusGuide` 吹き出し（`fixed z-50 bottom-6…`）が #2 のボトムバー（`fixed bottom-0`・`md:hidden`・認証時）とモバイルで重なる**こと。特に `MorpheusGuideDetail`（夢詳細・全モバイル幅で表示）で顕著。`MorpheusGuideHome` は `hidden sm:flex` で <640px は非表示。→ **認証ページ全般で起きるためグローバル修正が妥当**。

## 1. 設計原則

1. **認証はJS・レスポンシブはCSS**で分離。バーが「表示されている時（＝認証）」かつ「モバイル幅（＝バーが見える）」のときだけ吹き出しを逃がす。
2. **提示層のみ**。認証/ルーティング/Stripe/DBロジックに触れない。
3. **非衝突・最小侵襲**。`MorpheusGuide` の各 `positionClassName` を書き換えず、共通の逃がし量を一箇所で与える。
4. **公開ページ不変**。landing/login（バー無し）では逃がし量0で従来位置のまま。

## 2. 実装仕様

### 2.1 バー高さの公開（CSS変数 `--bottom-nav-h`）

- `app/globals.css`:
  - `:root` に既定 `--bottom-nav-h: 0px;` を追加（バー無し時は0）。
  - モバイル幅かつバー表示時のみ実値にする規則を追加:
    ```css
    @media (max-width: 767.98px) {
      body.has-bottom-nav {
        --bottom-nav-h: calc(env(safe-area-inset-bottom) + 5rem);
      }
    }
    ```
    （`767.98px` は Tailwind `md`(768px) と整合。5rem ≒ バー高さ4.5rem＋余白0.5rem。）

### 2.2 `BottomTabBar` が表示時に body クラスを付与（#2の成果物を加筆）

- `app/components/BottomTabBar.tsx`:
  - 表示条件（`authStatus!=="checking" && isLoggedIn`）を `show` として算出し、**早期 `return null` の前**にフックを置く。
  - `useEffect` で `show` のとき `document.body.classList.add("has-bottom-nav")`、クリーンアップで `remove`。`show` 依存。
  - 既存のレンダリング（spacer＋nav）は不変更。`md:hidden` はCSS側media queryが担保するため、JSは「バーが論理的に存在する＝認証」だけを表す。

### 2.3 固定 `MorpheusGuide` を逃がす

- `app/components/MorpheusGuide.tsx`:
  - `placement === "fixed"` のラッパ要素に `style={{ transform: "translateY(calc(-1 * var(--bottom-nav-h, 0px)))" }}` を付与。
  - これにより、バー表示時（`--bottom-nav-h` > 0）は吹き出し群が**バー分だけ上に**逃げ、非表示時（0）は従来位置のまま。
  - `positionClassName` は不変更（bottom値と非衝突。`translateY` で上乗せ）。
  - 注意: ラッパに `transform` を付けるが、固定の子孫を持たない（吹き出しは内部で `relative/absolute`）ため包含ブロック問題は起きない。

### 2.4 死にコード除去（3ファイル削除）

未マウントの連鎖（`VoiceRecorderClient`→`app/home/components/DreamRecorderFloating`→`app/components/DreamRecorderFloating`）はインポート元がゼロ。以下を削除:
- `frontend/app/home/VoiceRecorderClient.tsx`
- `frontend/app/home/components/DreamRecorderFloating.tsx`
- `frontend/app/components/DreamRecorderFloating.tsx`

（削除後、`app/home/components/` が空になる場合はディレクトリも除去。関連テストは存在しないことを確認済み。）

## 3. テスト方針（TDD）

- **BottomTabBar**（既存テストに追記）:
  - ログイン表示時、`document.body` に `has-bottom-nav` クラスが付く。
  - 未ログイン（null）では付かない。アンマウントで除去される。
- **MorpheusGuide**:
  - `placement="fixed"` 時、ラッパの `style.transform` に `var(--bottom-nav-h` を含む（逃がしが適用される）。
  - `placement="inline"` 時は transform を付けない。
- **globals.css**（#0と同様のコンテンツ回帰）:
  - `--bottom-nav-h:` 定義と `body.has-bottom-nav` 規則が存在する。
- 既存スイート（315件）が緑のまま。

## 4. 検証方針

- 完了ゲート: `yarn jest` 全緑 + `yarn build` 成功（既存の forest/[profileId] 型エラーは無関係）。
- **preview目視**:
  - 公開 `/login`（未ログイン・バー無し）: 固定吹き出しが従来位置（逃げない）こと。
  - 認証が必要なバー表示の発色/逃げ量は `isLoggedIn` 依存のため component test ＋ 手動QAに委ねる（限界明記）。`body.has-bottom-nav` の付与挙動はテストで担保。
  - デスクトップ幅で吹き出し・バーが従来どおり（`--bottom-nav-h` が0）であること。

## 5. 成果物と境界

**#3aで触る**: `app/globals.css`（`--bottom-nav-h`）/ `app/components/BottomTabBar.tsx`（body class 付与）/ `app/components/MorpheusGuide.tsx`（fixed逃がし）/ 死にコード3ファイル削除 / テスト追記。

**#3aで触らない（後続へ）**:
- ホーム本体の大きなレイアウト改修（#0/#1で世界観は満たすため不要）
- `MorpheusAvatar`（詳細/インサイト用小円クロップ）→ 後続#3スライス
- 森画面 → #4
- 認証/ルーティング/Stripe/DBロジック

**スタック**: 本PRは #2(`feat/bottom-tab-navigation`)にスタックし、#2マージ時に main へ自動再ターゲット。

## 6. リスクと注意

1. `BottomTabBar` のフック順序: `useEffect` は早期 `return null` より前に置く（条件付きフック禁止）。`show` をフック前に算出し effect 内で分岐。
2. `transform` の逃がしは `--bottom-nav-h` のみに依存。0時は `translateY(0)` で無影響（デスクトップ・公開ページ不変）を保証。
3. 死にコード削除前に、3ファイルがインポート元ゼロであることを再確認（barrel/dynamic含む）。
4. #2が未マージのため、本PRは#2にスタック。#2に変更が入った場合は追従リベースが必要。
