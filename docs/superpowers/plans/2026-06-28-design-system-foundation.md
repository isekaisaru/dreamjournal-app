# デザインシステム基盤(#0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** YumeTreeの世界観を再利用可能なデザイントークン（Morpheusサイズ・後光・感情色・空トーン）として `globals.css` に非破壊で定義し、後光をテーマ連動させる。

**Architecture:** Tailwind v4 の `@theme` + `:root`/`.dark` パターンに従い、CSSカスタムプロパティを**加算のみ**で追加する。唯一の既存挙動変更は `moon-pulse` の後光色を固定琥珀から `--glow-active`（明=紫 / 夜=琥珀）に切替えること。トークン定義はjestのコンテンツ回帰テストで固定する。

**Tech Stack:** Next.js 15 App Router, Tailwind CSS v4, Jest, framer-motion（既存）。

## Global Constraints

- 既存 `:root` の色値・既存ユーティリティ・既存アニメ定義は**変更しない**（加算のみ）。
- 触らない領域: 認証 / DB / Stripe / 森画面 / `EmotionTag.tsx` の実差し替え / `public/images/morpheus/generated/` 画像 / ダークモード2系統(`.dark`)の実値統合。これらは後続サブPJ。
- glowトークンは **RGB三つ組** で統一する（`rgb(var(--glow-x) / α)` 合成のため）。仕様§2.2の `--glow-morpheus: var(--primary)` はRGB等価 `124 58 237` に置換する。
- 感情色は `EmotionTag.tsx` の `getEmotionTone` を唯一の出典とする。確定対応: うれしい=orange-500(#f97316) / たのしい=amber-500(#f59e0b)。
- 完了ゲート: `yarn build` 成功 + `yarn jest` 全緑（既存278 + 新規）+ preview目視で light/dark 双方の後光視認。
- 作業ディレクトリ: `frontend/`。

---

### Task 1: 非破壊デザイントークンの定義

**Files:**
- Modify: `frontend/app/globals.css`（`:root` ブロック末尾に加算、`.dark` ブロックに `--glow-active` 追加）
- Test: `frontend/__tests__/app/design-tokens.test.ts`（新規）

**Interfaces:**
- Produces（後続タスク/サブPJが参照するCSSカスタムプロパティ）:
  - サイズ: `--morpheus-sm` `--morpheus-md` `--morpheus-lg` `--morpheus-hero`
  - 後光(RGB三つ組): `--glow-moon` `--glow-sky` `--glow-morpheus` `--glow-active`
  - 感情(hex): `--emotion-happy` `--emotion-fun` `--emotion-touched` `--emotion-angry` `--emotion-scared` `--emotion-worried` `--emotion-sad` `--emotion-relieved` `--emotion-surprised` `--emotion-unknown`
  - 空トーン: `--sky-night` `--sky-dawn` `--sky-day` `--sky-dusk`

- [ ] **Step 1: 失敗するテストを書く**

`frontend/__tests__/app/design-tokens.test.ts`:

```typescript
import fs from "fs";
import path from "path";

const css = fs.readFileSync(
  path.join(__dirname, "../../app/globals.css"),
  "utf8"
);

describe("design tokens (#0 foundation)", () => {
  it.each([
    "--morpheus-sm:",
    "--morpheus-md:",
    "--morpheus-lg:",
    "--morpheus-hero:",
    "--glow-moon:",
    "--glow-sky:",
    "--glow-morpheus:",
    "--glow-active:",
    "--emotion-happy:",
    "--emotion-fun:",
    "--emotion-touched:",
    "--emotion-angry:",
    "--emotion-scared:",
    "--emotion-worried:",
    "--emotion-sad:",
    "--emotion-relieved:",
    "--emotion-surprised:",
    "--emotion-unknown:",
    "--sky-night:",
    "--sky-dawn:",
    "--sky-day:",
    "--sky-dusk:",
  ])("defines %s", (token) => {
    expect(css).toContain(token);
  });

  it("heroサイズはclampで可変", () => {
    expect(css).toMatch(/--morpheus-hero:\s*clamp\(/);
  });

  it("感情色: うれしい=orange / たのしい=amber（取り違え防止）", () => {
    expect(css).toMatch(/--emotion-happy:\s*#f97316/i);
    expect(css).toMatch(/--emotion-fun:\s*#f59e0b/i);
  });
});
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `cd frontend && yarn jest __tests__/app/design-tokens.test.ts`
Expected: FAIL（`--morpheus-sm:` 等が `globals.css` に存在しない）

- [ ] **Step 3: トークンを `:root` 末尾に追加**

`frontend/app/globals.css` の `:root { ... }` ブロック内、既存トークン群の末尾（閉じ `}` の直前）に以下を追加する。既存の行は一切変更しない。

```css
    /* --- #0 デザインシステム基盤: 非破壊で加算するトークン --- */

    /* Morpheusサイズスケール（sm/md/lg は固定、hero はモバイルで縮む） */
    --morpheus-sm: 48px;
    --morpheus-md: 72px;
    --morpheus-lg: 108px;
    --morpheus-hero: clamp(120px, 36vw, 160px);

    /* 後光（RGB三つ組。rgb(var(--glow-x) / α) で合成する） */
    --glow-moon: 251 191 36;   /* 月の琥珀：夜空で映える */
    --glow-sky: 56 189 248;    /* 空の水色 */
    --glow-morpheus: 124 58 237; /* 紫＝primary(262 83% 58%)のRGB等価 */
    --glow-active: var(--glow-morpheus); /* lightの既定。.dark で月の琥珀へ切替 */

    /* 感情カラー（EmotionTag.tsx を唯一の出典に抽出） */
    --emotion-happy: #f97316;     /* うれしい / orange-500 */
    --emotion-fun: #f59e0b;       /* たのしい / amber-500 */
    --emotion-touched: #f43f5e;   /* じーんとした / rose-500 */
    --emotion-angry: #ef4444;     /* おこってる / red-500 */
    --emotion-scared: #9333ea;    /* こわい / purple-600 */
    --emotion-worried: #818cf8;   /* しんぱい / indigo-400 */
    --emotion-sad: #3b82f6;       /* かなしい / blue-500 */
    --emotion-relieved: #10b981;  /* ほっとした / emerald-500 */
    --emotion-surprised: #eab308; /* びっくり / yellow-500 */
    --emotion-unknown: #64748b;   /* わからない / slate-500 */

    /* 時刻連動 空トーン（getToneClassByHour の正式トークン化） */
    --sky-night: linear-gradient(180deg, rgba(15,23,42,0.96), rgba(30,41,59,0.96));
    --sky-dawn: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(239,246,255,0.96));
    --sky-day: linear-gradient(180deg, rgba(248,250,252,0.96), rgba(224,242,254,0.96));
    --sky-dusk: linear-gradient(180deg, rgba(255,247,237,0.96), rgba(254,215,170,0.24));
```

- [ ] **Step 4: `.dark` ブロックに `--glow-active` を追加**

`frontend/app/globals.css` の `.dark { ... }` ブロック内の末尾（閉じ `}` の直前）に1行追加する。既存行は変更しない。

```css
    --glow-active: var(--glow-moon); /* 夜空では月の琥珀後光 */
```

- [ ] **Step 5: テストを実行して成功を確認**

Run: `cd frontend && yarn jest __tests__/app/design-tokens.test.ts`
Expected: PASS（全トークン検出、hero=clamp、感情色の対応一致）

- [ ] **Step 6: コミット**

```bash
cd frontend && git add app/globals.css __tests__/app/design-tokens.test.ts
git commit -m "feat: デザインシステム基盤の非破壊トークンを追加

Morpheusサイズ/後光(RGB)/感情色/空トーンを :root に加算。
感情色は EmotionTag.tsx を出典に うれしい=orange/たのしい=amber で確定。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: moon-pulse 後光のテーマ連動化

**Files:**
- Modify: `frontend/app/globals.css`（`@theme` 内 `@keyframes moon-pulse`）
- Test: `frontend/__tests__/app/design-tokens.test.ts`（Task 1 の続きに追記）

**Interfaces:**
- Consumes: `--glow-active`（Task 1 で定義。:root=紫 / .dark=琥珀）
- Produces: 後光が明テーマでも視認できる `moon-pulse` アニメ（box-shadow色が `rgb(var(--glow-active) / α)`）

- [ ] **Step 1: 失敗するテストを追記**

`design-tokens.test.ts` の末尾（最後の `});` の直前のdescribe外、ファイル末尾）に追加:

```typescript
describe("moon-pulse 後光のテーマ連動", () => {
  const block = css.slice(
    css.indexOf("@keyframes moon-pulse"),
    css.indexOf("@keyframes moon-pulse") + 300
  );

  it("moon-pulseは--glow-activeを参照する", () => {
    expect(block).toContain("var(--glow-active)");
  });

  it("moon-pulseに固定琥珀rgba(251, 191, 36)を残さない", () => {
    expect(block).not.toMatch(/rgba\(251,\s*191,\s*36/);
  });
});
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `cd frontend && yarn jest __tests__/app/design-tokens.test.ts`
Expected: FAIL（現行 `moon-pulse` は `rgba(251, 191, 36, …)` 固定で `var(--glow-active)` を含まない）

- [ ] **Step 3: `@keyframes moon-pulse` を置換**

`frontend/app/globals.css` の既存ブロック:

```css
  @keyframes moon-pulse {
    0%, 100% {
      box-shadow: 0 0 12px rgba(251, 191, 36, 0.2);
    }
    50% {
      box-shadow: 0 0 28px rgba(251, 191, 36, 0.45), 0 0 55px rgba(251, 191, 36, 0.15);
    }
  }
```

を以下に置換する:

```css
  @keyframes moon-pulse {
    0%, 100% {
      box-shadow: 0 0 12px rgb(var(--glow-active) / 0.2);
    }
    50% {
      box-shadow: 0 0 28px rgb(var(--glow-active) / 0.45), 0 0 55px rgb(var(--glow-active) / 0.15);
    }
  }
```

- [ ] **Step 4: テストを実行して成功を確認**

Run: `cd frontend && yarn jest __tests__/app/design-tokens.test.ts`
Expected: PASS

- [ ] **Step 5: 完了ゲート（ビルド＋全テスト＋目視）**

```bash
cd frontend && yarn jest && yarn build
```
Expected: Jest 全緑（既存278 + 新規）、`yarn build` 成功。

目視（preview）: トップ or 音声記録画面で `animate-moon-pulse` を使う要素の後光が **lightテーマで紫として視認できる**こと、ダーク切替で **琥珀**になることを確認。`moon-pulse` 利用箇所の例: `grep -rn "moon-pulse\|animate-moon-pulse" app | head`。

- [ ] **Step 6: コミット**

```bash
cd frontend && git add app/globals.css __tests__/app/design-tokens.test.ts
git commit -m "feat: moon-pulse後光をテーマ連動化（明=紫/夜=琥珀）

固定琥珀を--glow-active参照に変更し、明テーマでも後光が視認できるよう改善。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage（仕様→タスク対応）:**
- §2.2 Morpheusサイズ → Task 1 ✓
- §2.2 グロー（テーマ連動）→ Task 1（定義）+ Task 2（moon-pulse連動）✓
- §2.2 感情カラー（命名・色確定）→ Task 1 ✓
- §2.2 空トーン → Task 1（`--sky-*`）✓
- §2.2 モーション（変更なし明文化）→ コード変更不要。仕様書に記載済み ✓
- §4 「moon-pulseのみ既存挙動変更」→ Task 2 ✓
- §5 ゲート（build/Jest/目視）→ Task 2 Step 5 ✓
- 対象外（EmotionTag実差し替え/森/ダーク統合）→ Global Constraints で明示除外 ✓

**2. Placeholder scan:** TBD/TODO・曖昧指示なし。全コードブロックに実コードを記載 ✓

**3. Type consistency:** トークン名は Task 1 Produces と Task 2 Consumes（`--glow-active`）で一致。感情色 hex は Global Constraints / spec §2.2 と一致 ✓

**注記:** 仕様§2.2の `--glow-morpheus: var(--primary)` を本プランでは RGB等価 `124 58 237` に統一した（rgb()合成のため）。実装後に spec §2.2 を同値へ追記修正する。
