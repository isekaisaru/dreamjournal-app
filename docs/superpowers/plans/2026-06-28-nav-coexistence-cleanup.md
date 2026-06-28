# ナビ共存とクリーンアップ(#3a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** #2のボトムバーと固定MorpheusGuide吹き出しのモバイル衝突を、認証連動のCSS変数クリアランスでグローバル解消し、未マウントの死にコードを除去する。

**Architecture:** `BottomTabBar` 表示時に `body.has-bottom-nav` を付与（認証=JS）→ globals.css の media query が `--bottom-nav-h` をモバイル時だけ実値化（レスポンシブ=CSS）→ 固定 `MorpheusGuide` ラッパが `translateY(calc(-1*var(--bottom-nav-h)))` でバー分だけ上に逃げる。バー無し/デスクトップでは変数0で無影響。

**Tech Stack:** Next.js 16 App Router, Tailwind v4, framer-motion, Jest + @testing-library/react.

## Global Constraints

- **#2にスタック**: 本ブランチ `feat/nav-coexistence-cleanup` は `feat/bottom-tab-navigation`(#2) から派生。`BottomTabBar.tsx` は#2の成果物だが本PRで加筆する。
- **提示層のみ**: 認証/ルーティング/Stripe/DBロジックに触れない。
- **公開ページ・デスクトップ不変**: `--bottom-nav-h` は既定 `0px`、`body.has-bottom-nav` かつ `max-width:767.98px` のときだけ実値。0時 `translateY(0)` で無影響。
- **フック順序**: `BottomTabBar` の `useEffect` は早期 `return null` より前に置く（条件付きフック禁止）。`show` をフック前に算出し effect 内で分岐。
- **transform は fixed ラッパのみ**: `MorpheusGuide` の `placement==="fixed"` のときだけ transform。固定の子孫を持たないため包含ブロック問題なし。
- 完了ゲート: `yarn jest` 全緑（既存315 + 新規）+ `yarn build` 成功（既存 forest/[profileId] 型エラーは無関係）。
- 作業ディレクトリ: `frontend/`。

---

### Task 1: ナビ共存クリアランス機構

**Files:**
- Modify: `frontend/app/globals.css`（`:root` に `--bottom-nav-h`、media query 追加）
- Modify: `frontend/app/components/BottomTabBar.tsx`（body class 付与）
- Modify: `frontend/app/components/MorpheusGuide.tsx`（fixed ラッパに transform）
- Test: `frontend/__tests__/app/design-tokens.test.ts`（追記）, `frontend/__tests__/components/BottomTabBar.test.tsx`（追記）, `frontend/__tests__/components/MorpheusGuide.test.tsx`（新規）

**Interfaces:**
- Produces: CSS変数 `--bottom-nav-h`（:root=0px、`body.has-bottom-nav`＋モバイルで実値）。`body.has-bottom-nav` クラス（BottomTabBar表示時）。固定MorpheusGuideの逃がし。

- [ ] **Step 1: globals.css のコンテンツ回帰テストを追記（失敗）**

`frontend/__tests__/app/design-tokens.test.ts` の末尾に追加:

```typescript
describe("bottom-nav clearance (#3a)", () => {
  it("--bottom-nav-h を既定0pxで定義する", () => {
    expect(css).toMatch(/--bottom-nav-h:\s*0px/);
  });
  it("モバイルでバー表示時に --bottom-nav-h を実値化する規則がある", () => {
    expect(css).toContain("body.has-bottom-nav");
    expect(css).toMatch(/max-width:\s*767\.98px/);
  });
});
```

- [ ] **Step 2: 実行して失敗を確認**

Run: `cd frontend && yarn jest __tests__/app/design-tokens.test.ts`
Expected: FAIL（`--bottom-nav-h` / `body.has-bottom-nav` 未定義）

- [ ] **Step 3: globals.css に変数と規則を追加**

`frontend/app/globals.css` の `:root { ... }` ブロック内（#0で追加した既存トークンの末尾、閉じ `}` の直前）に1行追加:

```css
    /* #3a: ボトムバー高さ（既定0。BottomTabBar表示時にmedia queryで実値化） */
    --bottom-nav-h: 0px;
```

さらに `.dark { ... }` ブロックの閉じ `}` の**後**（トップレベル）に以下を追加:

```css
/* #3a: モバイル幅かつボトムバー表示時のみ、固定要素が逃げる量を与える */
@media (max-width: 767.98px) {
  body.has-bottom-nav {
    --bottom-nav-h: calc(env(safe-area-inset-bottom) + 5rem);
  }
}
```

- [ ] **Step 4: design-tokens テストが緑になることを確認**

Run: `cd frontend && yarn jest __tests__/app/design-tokens.test.ts`
Expected: PASS

- [ ] **Step 5: BottomTabBar の body class テストを追記（失敗）**

`frontend/__tests__/components/BottomTabBar.test.tsx` の `describe("BottomTabBar", ...)` 内の末尾に追加:

```tsx
  it("ログイン時に body へ has-bottom-nav を付与する", () => {
    render(<BottomTabBar />);
    expect(document.body.classList.contains("has-bottom-nav")).toBe(true);
  });

  it("未ログインでは has-bottom-nav を付与しない", () => {
    mockUseAuth.mockReturnValue({ authStatus: "unauthenticated", isLoggedIn: false });
    render(<BottomTabBar />);
    expect(document.body.classList.contains("has-bottom-nav")).toBe(false);
  });

  it("アンマウントで has-bottom-nav を除去する", () => {
    const { unmount } = render(<BottomTabBar />);
    expect(document.body.classList.contains("has-bottom-nav")).toBe(true);
    unmount();
    expect(document.body.classList.contains("has-bottom-nav")).toBe(false);
  });
```

ファイル冒頭の `beforeEach(...)` の直後に、クラス漏れ防止の後処理を追加:

```tsx
afterEach(() => {
  document.body.classList.remove("has-bottom-nav");
});
```

- [ ] **Step 6: 実行して失敗を確認**

Run: `cd frontend && yarn jest __tests__/components/BottomTabBar.test.tsx`
Expected: FAIL（has-bottom-nav 未付与）

- [ ] **Step 7: BottomTabBar に body class 付与を実装**

`frontend/app/components/BottomTabBar.tsx`:

`import` に `useEffect` を追加（`react` から。既存に無ければ `import { useEffect } from "react";` を先頭付近に追加）。

既存の:

```tsx
  const pathname = usePathname();
  const { authStatus, isLoggedIn } = useAuth();

  if (authStatus === "checking" || !isLoggedIn) return null;
```

を以下に置換:

```tsx
  const pathname = usePathname();
  const { authStatus, isLoggedIn } = useAuth();

  const show = authStatus !== "checking" && isLoggedIn;

  useEffect(() => {
    if (!show) return;
    document.body.classList.add("has-bottom-nav");
    return () => {
      document.body.classList.remove("has-bottom-nav");
    };
  }, [show]);

  if (!show) return null;
```

- [ ] **Step 8: 実行して緑を確認**

Run: `cd frontend && yarn jest __tests__/components/BottomTabBar.test.tsx`
Expected: PASS

- [ ] **Step 9: MorpheusGuide の逃がしテストを新規作成（失敗）**

`frontend/__tests__/components/MorpheusGuide.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import MorpheusGuide from "@/app/components/MorpheusGuide";

jest.mock("@/app/components/MorpheusImage", () => ({
  __esModule: true,
  default: () => <div data-testid="morpheus-image" />,
}));

describe("MorpheusGuide bottom-nav 逃がし", () => {
  it("fixed配置ではバー分のtranslateYを当てる", () => {
    const { container } = render(
      <MorpheusGuide placement="fixed" expression="cheerful" message="やあ" />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.transform).toContain("var(--bottom-nav-h");
  });

  it("inline配置ではtransformを当てない", () => {
    const { container } = render(
      <MorpheusGuide placement="inline" expression="cheerful" message="やあ" />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.transform).toBe("");
  });
});
```

- [ ] **Step 10: 実行して失敗を確認**

Run: `cd frontend && yarn jest __tests__/components/MorpheusGuide.test.tsx`
Expected: FAIL（transform 未設定）

- [ ] **Step 11: MorpheusGuide の fixed ラッパに transform を付与**

`frontend/app/components/MorpheusGuide.tsx` の既存:

```tsx
  const wrapper =
    placement === "fixed"
      ? `fixed z-50 flex flex-col items-end gap-2 ${positionClassName} ${className}`
      : `flex flex-col items-end gap-2 ${className}`;

  return (
    <div className={wrapper}>
```

を以下に置換:

```tsx
  const wrapper =
    placement === "fixed"
      ? `fixed z-50 flex flex-col items-end gap-2 ${positionClassName} ${className}`
      : `flex flex-col items-end gap-2 ${className}`;

  // ボトムバー表示時（--bottom-nav-h>0）は、固定吹き出しをバー分だけ上に逃がす。
  const fixedStyle =
    placement === "fixed"
      ? { transform: "translateY(calc(-1 * var(--bottom-nav-h, 0px)))" }
      : undefined;

  return (
    <div className={wrapper} style={fixedStyle}>
```

- [ ] **Step 12: 実行して緑を確認**

Run: `cd frontend && yarn jest __tests__/components/MorpheusGuide.test.tsx`
Expected: PASS

- [ ] **Step 13: コミット**

```bash
cd frontend && git add app/globals.css app/components/BottomTabBar.tsx app/components/MorpheusGuide.tsx __tests__/app/design-tokens.test.ts __tests__/components/BottomTabBar.test.tsx __tests__/components/MorpheusGuide.test.tsx
git commit -m "feat: ボトムバーと固定吹き出しの衝突を認証連動で解消

BottomTabBar表示時にbody.has-bottom-navを付与、--bottom-nav-hで
固定MorpheusGuideをバー分だけ逃がす。公開/デスクトップは0で不変。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: 死にコード除去（DreamRecorderFloating連鎖）

**Files:**
- Delete: `frontend/app/home/VoiceRecorderClient.tsx`
- Delete: `frontend/app/home/components/DreamRecorderFloating.tsx`
- Delete: `frontend/app/components/DreamRecorderFloating.tsx`

**Interfaces:**
- Consumes: なし（3ファイルはインポート元ゼロの死にコード連鎖）

- [ ] **Step 1: インポート元ゼロを再確認**

Run:
```bash
cd frontend && grep -rn "VoiceRecorderClient" app __tests__ | grep -v "export default function VoiceRecorderClient"
grep -rn "DreamRecorderFloating" app __tests__ | grep -vE "DreamRecorderFloating\.tsx"
```
Expected: いずれも**出力なし**（=外部からの参照ゼロ）。`DreamRecorderFloating` の参照は2ファイル間の相互importのみで、`VoiceRecorderClient` の参照はゼロ。もし想定外の参照が出たら STOP して報告。

- [ ] **Step 2: 3ファイルを削除**

```bash
cd frontend && git rm app/home/VoiceRecorderClient.tsx app/home/components/DreamRecorderFloating.tsx app/components/DreamRecorderFloating.tsx
```

（`app/home/components/` が空になったらディレクトリも削除される。残る場合は気にしない。）

- [ ] **Step 3: 完了ゲート（全テスト＋ビルド）**

```bash
cd frontend && yarn jest && yarn build
```
Expected: Jest 全緑（既存315 + Task 1 の新規）、`yarn build` 成功。

> 注: `app/forest/[profileId]/page.tsx` の named export 起因の既存tscエラーが出る場合は、webpack compile が通り、#3a で触れた/削除したファイル由来の新規エラーが無ければゲートを満たす（既存エラーは別タスク）。

- [ ] **Step 4: コミット**

```bash
cd frontend && git commit -m "chore: 未マウントのDreamRecorderFloating系3ファイルを削除

VoiceRecorderClient→home/components/DreamRecorderFloating→components/DreamRecorderFloating
はインポート元ゼロの死にコードだったため除去。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage:**
- §2.1 `--bottom-nav-h` + media query → Task 1 Step 3 ✓
- §2.2 BottomTabBar body class（フック順序）→ Task 1 Step 7 ✓
- §2.3 MorpheusGuide fixed transform → Task 1 Step 11 ✓
- §2.4 死にコード3ファイル削除 → Task 2 ✓
- §3 テスト（globals回帰/body class/transform）→ Task 1 のテスト群 ✓
- §4 検証（build/jest/preview）→ Task 2 Step 3（preview目視はコントローラが実施）✓
- §6 リスク①フック順序 → `show` をフック前算出・effect内分岐 ✓ / ②transform0時無影響 → `var(--bottom-nav-h,0px)` ✓ / ③削除前再確認 → Task 2 Step 1 ✓

**2. Placeholder scan:** TBD/TODO・曖昧指示なし。全コードブロックに実コード ✓

**3. Type consistency:** `--bottom-nav-h` / `has-bottom-nav` 文字列は globals.css・BottomTabBar・MorpheusGuide・テストで一致。`show` 算出は `authStatus!=="checking" && isLoggedIn`（既存ガードと同値）✓
