# MorpheusAvatar 適用(#3スライス) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 円形・顔クロップの `MorpheusAvatar` を新設し、`DreamStatsWidget`(インサイト) と 夢詳細の分析カードに適用する。variant→src/alt マップは `morpheusAssets.ts` に抽出して `MorpheusImage` と共有する。

**Architecture:** `MorpheusImage` 内の `MorpheusImageVariant`/`MORPHEUS_IMAGE_SRC`/`ALT_BY_VARIANT` を純データモジュール `morpheusAssets.ts` へ移動（`MorpheusImage` は型を再export して既存importを非破壊）。`MorpheusAvatar` はその map を使い、円形コンテナ＋`next/image fill object-cover`＋`transform: scale(2) transformOrigin:center 25%` で顔にズーム。後光は付けない。

**Tech Stack:** Next.js 16 App Router, Tailwind v4, next/image, Jest + @testing-library/react.

## Global Constraints

- **提示層のみ**: 認証/ルーティング/Stripe/DBロジックに触れない。表示の差し替え/追加のみ。
- **後方互換**: `MorpheusImageVariant` の既存import元は `MorpheusImage`（多数のファイルが `import { ... type MorpheusImageVariant } from ".../MorpheusImage"`）。抽出後も `MorpheusImage` から**再export**して壊さない。
- **アセット単一出典**: src/alt マップは `morpheusAssets.ts` のみが持つ。再タイプ禁止＝既存ブロックを**そのまま移動**。
- **後光なし**: `MorpheusAvatar` に `animate-moon-pulse` を付けない（#0早見表「詳細＝後光なし」）。
- 完了ゲート: `yarn jest` 全緑（既存322 + 新規）+ `yarn build` 成功（既存 forest/[profileId] 型エラーは無関係）。
- 作業ディレクトリ: `frontend/`。

---

### Task 1: アセットマップ抽出（morpheusAssets）＋ MorpheusImage 再export

**Files:**
- Create: `frontend/app/components/morpheusAssets.ts`
- Modify: `frontend/app/components/MorpheusImage.tsx`
- Test: `frontend/__tests__/components/morpheusAssets.test.ts`（新規）

**Interfaces:**
- Produces: `morpheusAssets.ts` から `MorpheusImageVariant`(type) / `MORPHEUS_IMAGE_SRC` / `ALT_BY_VARIANT` を export。`MorpheusImage.tsx` は `MorpheusImageVariant` を再export（後続import互換）。

- [ ] **Step 1: 失敗するテストを書く**

`frontend/__tests__/components/morpheusAssets.test.ts`:

```typescript
import { MORPHEUS_IMAGE_SRC, ALT_BY_VARIANT } from "@/app/components/morpheusAssets";

describe("morpheusAssets", () => {
  it("src と alt が同じ variant 集合を網羅する", () => {
    const srcKeys = Object.keys(MORPHEUS_IMAGE_SRC).sort();
    const altKeys = Object.keys(ALT_BY_VARIANT).sort();
    expect(srcKeys.length).toBeGreaterThan(0);
    expect(srcKeys).toEqual(altKeys);
  });
  it("analysis variant の src は morpheus-analysis 画像を指す", () => {
    expect(MORPHEUS_IMAGE_SRC.analysis).toContain("morpheus-analysis");
  });
});
```

- [ ] **Step 2: 実行して失敗を確認**

Run: `cd frontend && yarn jest __tests__/components/morpheusAssets.test.ts`
Expected: FAIL（`morpheusAssets` モジュール未解決）

- [ ] **Step 3: `morpheusAssets.ts` を作成し、MorpheusImage からマップを移動**

まず `frontend/app/components/MorpheusImage.tsx` を読み、以下3ブロックを**そのまま（verbatim）切り取る**:
- `export type MorpheusImageVariant = ... ;`（union 型定義）
- `const MORPHEUS_IMAGE_SRC: Record<MorpheusImageVariant, string> = { ... };`
- `const ALT_BY_VARIANT: Record<MorpheusImageVariant, string> = { ... };`

切り取った3ブロックを `frontend/app/components/morpheusAssets.ts` に貼り付け、2つの `const` に `export` を付ける（型は既に `export type`）。ファイル冒頭コメント例:

```typescript
/**
 * Morpheus 画像アセットの単一出典（variant → 画像/altテキスト）。
 * MorpheusImage（全身）と MorpheusAvatar（顔クロップ）が共有する。
 */
// ↓ ここに MorpheusImage から移動した
//   export type MorpheusImageVariant / export const MORPHEUS_IMAGE_SRC / export const ALT_BY_VARIANT
//   を貼り付ける（src/alt の中身は再タイプせず移動すること）
```

- [ ] **Step 4: `MorpheusImage.tsx` を import に切替＋型を再export**

`MorpheusImage.tsx` の既存 import 群に追加:

```typescript
import {
  MORPHEUS_IMAGE_SRC,
  ALT_BY_VARIANT,
  type MorpheusImageVariant,
} from "./morpheusAssets";
```

そして、移動して消えた `export type MorpheusImageVariant` の代わりに、既存importを壊さないための再exportを追加（import群の近くに1行）:

```typescript
export type { MorpheusImageVariant };
```

`FALLBACK_EXPRESSION`（`MorpheusExpression` 依存）は `MorpheusImage.tsx` に残す。`MorpheusImage` 本体のロジック（cssSize 等）は不変更。

- [ ] **Step 5: テスト緑＋既存スイートで後方互換を確認**

Run: `cd frontend && yarn jest __tests__/components/morpheusAssets.test.ts __tests__/components/MorpheusImage.test.tsx`
Expected: PASS（新規 morpheusAssets 緑、既存 MorpheusImage テストも緑＝抽出が後方互換）

- [ ] **Step 6: コミット**

```bash
cd frontend && git add app/components/morpheusAssets.ts app/components/MorpheusImage.tsx __tests__/components/morpheusAssets.test.ts
git commit -m "refactor: Morpheusのvariant→src/altマップをmorpheusAssetsへ抽出

MorpheusImageとMorpheusAvatarで共有する単一出典に。MorpheusImageは
MorpheusImageVariantを再exportし既存importを非破壊。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: MorpheusAvatar コンポーネント

**Files:**
- Create: `frontend/app/components/MorpheusAvatar.tsx`
- Test: `frontend/__tests__/components/MorpheusAvatar.test.tsx`（新規）

**Interfaces:**
- Consumes: `MORPHEUS_IMAGE_SRC` / `ALT_BY_VARIANT` / `MorpheusImageVariant`（`./morpheusAssets`、Task 1）。
- Produces: `export default function MorpheusAvatar(props): JSX.Element`、props `{ variant: MorpheusImageVariant; size?: number; className?: string; priority?: boolean }`。

- [ ] **Step 1: 失敗するテストを書く**

`frontend/__tests__/components/MorpheusAvatar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import MorpheusAvatar from "@/app/components/MorpheusAvatar";

describe("MorpheusAvatar", () => {
  it("variantに応じた画像とaltで描画する", () => {
    render(<MorpheusAvatar variant="analysis" />);
    const img = screen.getByAltText("夢の本を読んで分析しているモルペウス");
    expect(img.getAttribute("src")).toContain("morpheus-analysis");
  });

  it("円形クロップ構造（rounded-full + overflow-hidden）を持つ", () => {
    const { container } = render(<MorpheusAvatar variant="analysis" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("rounded-full");
    expect(wrapper.className).toContain("overflow-hidden");
  });

  it("後光(animate-moon-pulse)を付けない", () => {
    const { container } = render(<MorpheusAvatar variant="analysis" />);
    expect(container.innerHTML).not.toContain("animate-moon-pulse");
  });
});
```

- [ ] **Step 2: 実行して失敗を確認**

Run: `cd frontend && yarn jest __tests__/components/MorpheusAvatar.test.tsx`
Expected: FAIL（`MorpheusAvatar` 未解決）

- [ ] **Step 3: `MorpheusAvatar.tsx` を実装**

`frontend/app/components/MorpheusAvatar.tsx`:

```tsx
"use client";

import Image from "next/image";

import {
  MORPHEUS_IMAGE_SRC,
  ALT_BY_VARIANT,
  type MorpheusImageVariant,
} from "./morpheusAssets";

type MorpheusAvatarProps = {
  variant: MorpheusImageVariant;
  size?: number;
  className?: string;
  priority?: boolean;
};

/**
 * Morpheus の顔を円形にクロップした小アバター。
 * 全身画像（正方形・顔は上部中央）を object-cover + scale で顔にズームする。
 * 後光は付けない（#0早見表「詳細＝後光なし」）。
 */
export default function MorpheusAvatar({
  variant,
  size = 56,
  className = "",
  priority = false,
}: MorpheusAvatarProps) {
  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={MORPHEUS_IMAGE_SRC[variant]}
        alt={ALT_BY_VARIANT[variant]}
        fill
        sizes={`${size}px`}
        priority={priority}
        className="object-cover"
        style={{ transform: "scale(2)", transformOrigin: "center 25%" }}
      />
    </span>
  );
}
```

- [ ] **Step 4: テスト緑を確認**

Run: `cd frontend && yarn jest __tests__/components/MorpheusAvatar.test.tsx`
Expected: PASS（3テスト緑）

- [ ] **Step 5: コミット**

```bash
cd frontend && git add app/components/MorpheusAvatar.tsx __tests__/components/MorpheusAvatar.test.tsx
git commit -m "feat: 顔を円形クロップするMorpheusAvatarを追加

全身画像を object-cover + scale で顔にズーム。後光なし。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: DreamStatsWidget と 夢詳細への適用

**Files:**
- Modify: `frontend/app/components/DreamStatsWidget.tsx`
- Modify: `frontend/app/dream/[id]/page.tsx`

**Interfaces:**
- Consumes: `MorpheusAvatar`（Task 2、`@/app/components/MorpheusAvatar` または相対）。

- [ ] **Step 1: DreamStatsWidget の import を差し替え**

`frontend/app/components/DreamStatsWidget.tsx` の
`import MorpheusImage from "./MorpheusImage";`
を
`import MorpheusAvatar from "./MorpheusAvatar";`
に変更。

- [ ] **Step 2: DreamStatsWidget の今週サマリーを置換**

既存:

```tsx
          <div className="shrink-0 rounded-xl bg-white/80 p-1 shadow-sm ring-1 ring-sky-100 dark:bg-white/10 dark:ring-white/10">
            <MorpheusImage variant="analysis" size={54} />
          </div>
```

を以下に置換（円アバター自身が ring を持つため囲み箱は不要）:

```tsx
          <MorpheusAvatar variant="analysis" size={54} className="shadow-sm" />
```

- [ ] **Step 3: 夢詳細の import を追加**

`frontend/app/dream/[id]/page.tsx` の import 群（`import { MorpheusGuideDetail } from "@/app/components/MorpheusGuide";` の近く）に追加:

```tsx
import MorpheusAvatar from "@/app/components/MorpheusAvatar";
```

- [ ] **Step 4: 夢詳細の分析カードの🔮ボックスを置換**

既存:

```tsx
                  <div className="rounded-3xl bg-primary/10 px-4 py-3 text-3xl">
                    🔮
                  </div>
```

を以下に置換:

```tsx
                  <MorpheusAvatar variant="analysis" size={56} />
```

- [ ] **Step 5: 完了ゲート（全テスト＋ビルド）**

```bash
cd frontend && yarn jest && yarn build
```
Expected: Jest 全緑（既存322 + Task1/2 の新規）、`yarn build` 成功。
（`app/forest/[profileId]/page.tsx` の既存 named export 型エラーで止まる場合は、webpack compile が通り、#3で触れたファイル由来の新規エラーが無ければゲートを満たす。）

- [ ] **Step 6: コミット**

```bash
cd frontend && git add app/components/DreamStatsWidget.tsx "app/dream/[id]/page.tsx"
git commit -m "feat: インサイトと夢詳細の分析アバターをMorpheusAvatarに

DreamStatsWidgetの今週サマリーと夢詳細の分析カード（🔮）を
円形顔クロップのMorpheusAvatarに差し替え。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage:**
- §2.1 アセット抽出＋再export → Task 1 ✓
- §2.2 MorpheusAvatar（円クロップ・後光なし）→ Task 2 ✓
- §2.3 適用2カ所 → Task 3 ✓
- §3 テスト（avatar src/alt・円構造・後光なし / assets網羅 / 既存緑）→ Task 1・2 のテスト ✓
- §4 検証（build/jest）→ Task 3 Step 5。クロップ目視(eval注入)はコントローラが実施 ✓
- §6 リスク①再export → Task 1 Step 4＋既存テストで担保 ✓ / ②transform無害 → 固定子孫なし ✓ / ③クロップ目視 → コントローラ ✓

**2. Placeholder scan:** Task 1 Step 3 は「移動」指示（再タイプ防止）で意図的に中身を列挙しない＝プレースホルダではなく安全策。他は実コード。✓

**3. Type consistency:** `MorpheusAvatar` props（`variant`/`size`/`className`/`priority`）は Task 2 定義＝Task 3 使用と一致。`MORPHEUS_IMAGE_SRC`/`ALT_BY_VARIANT`/`MorpheusImageVariant` は Task 1 produces＝Task 2 consumes 一致。`alt`「夢の本を読んで分析しているモルペウス」はテストと実マップで一致（要・実マップ確認：morpheus-analysis の alt）。✓
