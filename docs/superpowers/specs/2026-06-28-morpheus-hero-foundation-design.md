# Morpheusヒーロー基盤（サブPJ #1）設計仕様

- 日付: 2026-06-28
- 対象: YumeTree フロントエンド（Next.js 15 App Router + Tailwind v4 + framer-motion）
- 前提: #0 デザインシステム基盤（PR #394, main `51432e9`）がマージ済み。`--morpheus-hero`(clamp 120–160) / `--glow-active`(明=紫/夜=琥珀, `moon-pulse`連動) / `animate-morpheus-float` が利用可能。
- 位置づけ: 全画面リデザインの#1。既存 `MorpheusHero` を**#0トークン駆動の正準ヒーロープリミティブ**へ格上げし、全消費先を掛け替える。
- スコープ判断: ユーザーが「広め（全画面掛け替え）」を選択。

## 0. 背景

`MorpheusHero` は既に存在するが、サイズ150–220を全消費先が固定指定し、`--morpheus-hero` clamp も `animate-moon-pulse` 後光も `animate-morpheus-float` も未使用。#1でこれを#0トークン駆動に統一し、レスポンシブ化・後光・浮遊を与える。森画面はMorpheusHero非消費（MorpheusImage直利用）のため**#1では触れない**（#4で扱う）。

## 1. 設計原則

1. **後方互換**: `MorpheusHero` / `MorpheusImage` の既存propは壊さない。新挙動はデフォルト、旧挙動はprop上書きで温存。
2. **トークン駆動**: ヒーロー描画サイズは `var(--morpheus-hero)`、後光は `animate-moon-pulse`（#0でテーマ連動済み）、浮遊は `animate-morpheus-float`。新規の色・サイズのハードコードを足さない。
3. **提示的変更のみ**: 認証・Stripe・DB・ルーティングのロジックには触れない。変更はビジュアル（サイズ/後光/浮遊）に限定。

## 2. コンポーネント仕様

### 2.1 `MorpheusImage`（`app/components/MorpheusImage.tsx`）— 加算
正方形画像（1254×1254）。レスポンシブ描画のため任意prop `cssSize` を追加する。

- 追加prop: `cssSize?: string`（例 `"var(--morpheus-hero)"`）
- 挙動:
  - `cssSize` 指定時: `next/image` の intrinsic `width`/`height` は数値 `size`（最適化用。`cssSize`使用時の既定intrinsicは320=Retina想定）に保ちつつ、描画サイズを `style={{ width: cssSize, height: cssSize }}` で可変にする。`sizes` も `cssSize` を反映。
  - `cssSize` 未指定時: 現状どおり `width=height=size`（数値）でレンダリング（既存挙動・後方互換）。
  - フォールバック `MorpheusSVG` も `cssSize` 指定時は同じCSSサイズで描画する（数値`size`しか持たない場合との整合）。
- 既存の `variant` / `priority` / `className` / framer-motion entry / drop-shadow / onErrorフォールバックは不変更。

### 2.2 `MorpheusHero`（`app/components/MorpheusHero.tsx`）— 格上げ
- 描画サイズ: 既定で `MorpheusImage` に `cssSize="var(--morpheus-hero)"` を渡す。`size`(数値)propが渡された場合のみ従来の固定サイズに上書き（後方互換）。
- 後光: Morpheus画像の背後に `rounded-full` + `animate-moon-pulse` のグローリング要素を1つ追加（早見表「後光あり」）。色は `--glow-active` 連動（明=紫/夜=琥珀）。`pointer-events-none`・`aria-hidden`。
- 浮遊: 画像ラッパに `motion-safe:animate-morpheus-float` を付与（既存framer-motion entryと併用可）。
- 既存API（`title` / `message` / `expression` / `imageVariant` / `variant`(home/compose/detail/voice) / `className` / `action`）は不変更。既存の装飾（blur blob・✦/⋆）は維持。

### 2.3 消費先の固定size掃き出し（全画面掛け替え）
以下から `size={...}` を除去し、`MorpheusHero` のレスポンシブ既定に委ねる:

| ファイル | 現状size | 対応 |
|---|---|---|
| `app/home/page.tsx` | 164 | `size`除去 |
| `app/subscription/page.tsx`（2箇所） | 160, 160 | `size`除去 |
| `app/components/MorpheusLoginRequired.tsx` | 168 | `size`除去 |
| `app/components/MorpheusGuide.tsx`（2箇所） | 220, 既定 | `size`除去 |
| `app/login/page.tsx` | 150 | `size`除去 |

> `MorpheusGuide` / `MorpheusLoginRequired` は共有ラッパなので、これらの掃き出しで詳細/設定/サブスク等の画面にも自動反映される。これは意図どおり。

## 3. テスト方針（TDD・component render）

既存パターン（`@testing-library/react` + jest, `__tests__/app/...`）に従う。

- **MorpheusImage**:
  - `cssSize` 指定時、`<img>` が `style` の width/height に `cssSize` を反映する。
  - `cssSize` 未指定時、従来どおり数値`size`でレンダリングする（後方互換）。
- **MorpheusHero**:
  - 後光リング（`animate-moon-pulse` を持つ `aria-hidden` 要素）が描画される。
  - 既定で `MorpheusImage` にトークンサイズ（`var(--morpheus-hero)`）が渡る。
  - `title` / `message` が描画される（既存表示の回帰防止）。
- 既存スイート（304件）が緑のまま。

## 4. 検証方針

- 完了ゲート: `yarn jest` 全緑 + `yarn build` 成功。
- **preview目視（公開ページ）**: `/login`（MorpheusHero消費・未認証で表示可）を preview で起動し、
  - light: 後光が**紫**で視認できる
  - dark: 後光が**琥珀**
  - スマホ幅（~390px）でヒーローが `--morpheus-hero` の下限~120pxに収まる
  をスクリーンショットで確認。これにより#0で持ち越した「公開ページでの後光発色目視」も消化する。

## 5. 成果物と境界

**#1で触る**: `MorpheusImage.tsx`（`cssSize`加算）/ `MorpheusHero.tsx`（格上げ）/ 上表の6ファイルのsize掃き出し / 新規テスト。

**#1で触らない（後続へ）**:
- 詳細/インサイト用の小円クロップ `MorpheusAvatar` プリミティブ → 消費先が出る#3まで保留（YAGNI）
- 森画面（MorpheusHero非消費）→ #4
- 認証/DB/Stripe/ルーティングのロジック

**ドキュメント**: 本仕様書 + 実装プラン。

## 6. リスクと注意

- 後光/浮遊は共有 `MorpheusHero` 由来のため、home/subscription（認証ページ）にも自動反映される。提示的変更のみで、Stripe/認証ロジックは不変更。
- `cssSize` 導入で `next/image` の最適化が崩れないこと（intrinsic 320を保持、`sizes`整合）をビルドで確認。
- 既存の数値`size`上書き経路を残すため、想定外の回帰時はprop指定で即旧挙動に戻せる。
