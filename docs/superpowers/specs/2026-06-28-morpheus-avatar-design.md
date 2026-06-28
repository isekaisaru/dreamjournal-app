# MorpheusAvatar 適用（サブPJ #3・アバタースライス）設計仕様

- 日付: 2026-06-28
- 対象: YumeTree フロントエンド（Next.js 16 App Router + Tailwind v4）
- 前提: #0(#394)/#1(#395)/#2(#396)/#3a(#397) マージ済み。本ブランチは main から派生。
- 位置づけ: #1でYAGNI保留した「詳細/インサイト用の小円クロップ `MorpheusAvatar`」の回収。#0早見表「詳細＝analysis・sm48〜56・円クロップ・後光なし」を実装。
- スコープ判断: 適用は2カ所（`DreamStatsWidget` インサイト＋夢詳細の分析カード）。月次サマリーは後続（ユーザー選択）。

## 0. 背景

- `DreamStatsWidget`（ホーム「今月のきもち」）の「今週サマリー」に既に `MorpheusImage variant="analysis" size={54}`（rounded-xl箱・全身）がある → 円クロップ顔アバターに置換すると世界観が締まる。
- 夢詳細 `dream/[id]` の「🔮 AI分析」カード前面に `rounded-3xl bg-primary/10 ... text-3xl` の **🔮絵文字ボックス**がある → これを Morpheus の分析アバターに置換し「Morpheusが夢を読む」顔を主役にする。
- 実画像は1254四方のチビ全身（顔は上部中央・縦~25%付近）。`MorpheusImage` は `object-contain`（全身表示）なので、顔クロップ用の別プリミティブが要る。

## 1. 設計原則

1. **提示層のみ**。認証/ルーティング/Stripe/DBに触れない。表示の差し替え/追加のみ。
2. **アセット単一出典**。variant→src/alt マップを `MorpheusImage` と `MorpheusAvatar` で共有（DRY）。
3. **後方互換**。`MorpheusImageVariant` の既存import元（`MorpheusImage`）を壊さない（再export）。
4. **後光なし**（#0早見表「詳細＝後光なし」）。アバターは ring のみ、`moon-pulse` は付けない。

## 2. 実装仕様

### 2.1 アセットマップ抽出 `app/components/morpheusAssets.ts`（新規）
- `MorpheusImageVariant` 型 / `MORPHEUS_IMAGE_SRC` / `ALT_BY_VARIANT` を `MorpheusImage.tsx` から移動。
- `MorpheusImage.tsx` はこれらを import し、**`export type { MorpheusImageVariant }` を再export**（既存の `import { MorpheusImageVariant } from "./MorpheusImage"` 多数を壊さないため）。`FALLBACK_EXPRESSION` は `MorpheusImage` に残す（SVGフォールバック固有）。
- 純データモジュールのため循環依存なし（型もこのモジュールが起点）。

### 2.2 新規 `app/components/MorpheusAvatar.tsx`（client）
- props: `variant: MorpheusImageVariant` / `size?: number`（既定 56）/ `className?: string` / `priority?: boolean`。
- 描画: 円形コンテナ（`relative inline-flex shrink-0 overflow-hidden rounded-full ring-1 ring-border bg-muted`、`style={{ width: size, height: size }}`）の中に `next/image` を `fill` `sizes={size}px` `className="object-cover"`、`style={{ transform: "scale(2)", transformOrigin: "center 25%" }}` で**顔（上部中央）にズーム**。
- alt は `ALT_BY_VARIANT[variant]`。`onError` で簡易フォールバック（`bg-muted` のまま・装飾要素のため SVG フォールバックは不要）。
- クロップ値（`scale(2)` / `transformOrigin center 25%`）は preview への要素注入で目視確認し微調整する（§4）。

### 2.3 適用
- `app/components/DreamStatsWidget.tsx`: 「今週サマリー」の
  `<MorpheusImage variant="analysis" size={54} />` を
  `<MorpheusAvatar variant="analysis" size={54} />` に置換（囲みの `rounded-xl` 箱は ring と重複するため整理して可。最小では中身だけ差し替え）。import も差し替え。
- `app/dream/[id]/page.tsx`: 分析カード前面の
  `<div className="rounded-3xl bg-primary/10 px-4 py-3 text-3xl">🔮</div>` を
  `<MorpheusAvatar variant="analysis" size={56} />` に置換。`MorpheusAvatar` を import。

## 3. テスト方針（TDD・component render）

- **MorpheusAvatar**:
  - `variant` に応じた `src`（`MORPHEUS_IMAGE_SRC[variant]` の末尾一致）と `alt`（`ALT_BY_VARIANT[variant]`）で `<img>` を描画する。
  - コンテナが円形クロップ構造（`rounded-full` ＋ `overflow-hidden`）を持つ。
  - 後光（`animate-moon-pulse`）を**付けない**（クラスに含まれない）。
- **morpheusAssets**: `MORPHEUS_IMAGE_SRC` と `ALT_BY_VARIANT` が全 variant を網羅（キー数一致）。
- 既存スイート（322件）が緑のまま（`MorpheusImage` 抽出後も既存テストが通る＝後方互換確認）。

## 4. 検証方針

- 完了ゲート: `yarn jest` 全緑 + `yarn build` 成功。
- **クロップ目視（認証不要）**: preview を起動し、`preview_eval` で `MorpheusAvatar` と同一の背景/transform を持つ要素を一時的にDOM注入してスクリーンショット → 顔が円内に収まるか確認し、必要なら `scale`/`transformOrigin` を調整。
- 実画面（DreamStatsWidget・夢詳細）は認証ページのため、配置後の発色は手動QAに委ねる（component testで構造担保）。

## 5. 成果物と境界

**#3（本スライス）で触る**: `morpheusAssets.ts`（新規）/ `MorpheusImage.tsx`（マップ抽出＋型再export）/ `MorpheusAvatar.tsx`（新規）/ `DreamStatsWidget.tsx` / `dream/[id]/page.tsx` / 新規テスト。

**触らない（後続へ）**: 月次サマリー(`dream/month/[yearMonth]`)への適用 → 後続スライス。森画面 → #4。認証/Stripe/DB。

## 6. リスクと注意

1. `MorpheusImage` のマップ抽出で既存の `MorpheusImageVariant` import を壊さない（再export必須）。`yarn build` ＋ 既存 MorpheusImage テストで担保。
2. `transform: scale` はアバター要素に stacking context を作るが、固定子孫を持たないため無害。
3. クロップ値は当て勘にせず §4 の eval 注入で確認。変な見切れがあれば `transformOrigin`/`scale` を調整。
4. `DreamStatsWidget` の囲み箱を整理する場合も、既存の余白/リングと二重にならない範囲に留める（提示的最小変更）。
