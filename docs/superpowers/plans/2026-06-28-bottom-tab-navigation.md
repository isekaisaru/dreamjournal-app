# ボトムタブ・ナビゲーション(#2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** モバイル専用の認証連動ボトムタブバー（おうち/もり/[＋きろくFAB]/マイ夢/設定）を新設し、`layout.tsx` にマウントする。

**Architecture:** 新規 client コンポーネント `BottomTabBar` を作り、`useAuth` でログイン時のみ描画。FABは既存 `DreamEntryLauncher` を円形に整形して再利用。コンテンツがバーに隠れないよう、バー自身が「ログイン時・モバイルのみ」のスペーサーを描画する（`layout.tsx` 本体のpaddingは変えず、デスクトップをピクセル不変に保つ）。

**Tech Stack:** Next.js 16 App Router, Tailwind v4, lucide-react, framer-motion(既存), Jest + @testing-library/react.

## Global Constraints

- **提示層のみ**: 認証・ルーティング・Stripe・DBのロジックには触れない。既存リンク/既存 `DreamEntryLauncher` への導線のみ。
- **デスクトップ不変**: バーは `md:hidden`。`layout.tsx` の既存クラス・padding は変更しない（スペーサーは `BottomTabBar` 内に閉じる）。
- **認証連動**: `authStatus === "checking"` または `!isLoggedIn` のとき `return null`。`useAuth()` は `{ authStatus, isLoggedIn, logout }` を返す（既存 `AuthNav` と同型）。
- **アクティブ判定**: `pathname === href || (href !== "/" && pathname?.startsWith(href))`（`AuthNav` と同一）。
- **FAB再利用**: 中央は `DreamEntryLauncher`（`buttonLabel`/`buttonClassName`/`showSparkles` で整形）。新規モーダルは作らない。
- **navに backdrop-filter / transform を付けない**: `DreamEntryLauncher` のモーダルは `fixed inset-0 z-[100]`。祖先に `backdrop-filter`(=`backdrop-blur`) や `transform` があると包含ブロック化してモーダルが全画面化できない。nav はソリッド `bg-background` にする。
- **タブ確定**: `/home`=おうち(House) / `/forest`=もり(Trees) / 中央FAB=きろく / `/my-dreams`=マイ夢(Moon) / `/settings`=設定(Settings)。子ども向けのやさしい語彙を踏襲。
- 完了ゲート: `yarn jest` 全緑（既存311 + 新規）+ `yarn build` 成功。
- 作業ディレクトリ: `frontend/`。

---

### Task 1: BottomTabBar コンポーネント

**Files:**
- Create: `frontend/app/components/BottomTabBar.tsx`
- Test: `frontend/__tests__/components/BottomTabBar.test.tsx`

**Interfaces:**
- Consumes: `useAuth()`→`{ authStatus: string; isLoggedIn: boolean }`（`@/context/AuthContext`）, `usePathname()`（`next/navigation`）, `DreamEntryLauncher`（`./DreamEntryLauncher`、props `buttonLabel`/`buttonClassName`/`showSparkles`）。
- Produces: `export default function BottomTabBar(): JSX.Element | null`（props無し）。

- [ ] **Step 1: 失敗するテストを書く**

`frontend/__tests__/components/BottomTabBar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import BottomTabBar from "@/app/components/BottomTabBar";

const mockUsePathname = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

const mockUseAuth = jest.fn();
jest.mock("@/context/AuthContext", () => ({
  __esModule: true,
  useAuth: () => mockUseAuth(),
}));

jest.mock("@/app/components/DreamEntryLauncher", () => ({
  __esModule: true,
  default: ({ buttonLabel }: { buttonLabel: string }) => (
    <button>{buttonLabel}</button>
  ),
}));

beforeEach(() => {
  mockUsePathname.mockReturnValue("/home");
  mockUseAuth.mockReturnValue({ authStatus: "authenticated", isLoggedIn: true });
});

describe("BottomTabBar", () => {
  it("未ログインでは何も描画しない", () => {
    mockUseAuth.mockReturnValue({ authStatus: "unauthenticated", isLoggedIn: false });
    const { container } = render(<BottomTabBar />);
    expect(container).toBeEmptyDOMElement();
  });

  it("認証確認中は何も描画しない", () => {
    mockUseAuth.mockReturnValue({ authStatus: "checking", isLoggedIn: false });
    const { container } = render(<BottomTabBar />);
    expect(container).toBeEmptyDOMElement();
  });

  it("ログイン時に4タブと記録FABを描画する", () => {
    render(<BottomTabBar />);
    expect(screen.getByRole("link", { name: "おうち" })).toHaveAttribute("href", "/home");
    expect(screen.getByRole("link", { name: "もり" })).toHaveAttribute("href", "/forest");
    expect(screen.getByRole("link", { name: "マイ夢" })).toHaveAttribute("href", "/my-dreams");
    expect(screen.getByRole("link", { name: "設定" })).toHaveAttribute("href", "/settings");
    expect(screen.getByRole("button", { name: "夢をきろくする" })).toBeInTheDocument();
  });

  it("現在地のタブをアクティブ表示する", () => {
    mockUsePathname.mockReturnValue("/forest");
    render(<BottomTabBar />);
    expect(screen.getByRole("link", { name: "もり" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "おうち" })).not.toHaveAttribute("aria-current");
  });
});
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `cd frontend && yarn jest __tests__/components/BottomTabBar.test.tsx`
Expected: FAIL（`BottomTabBar` が存在しない / モジュール未解決）

- [ ] **Step 3: コンポーネントを実装**

`frontend/app/components/BottomTabBar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Trees, Moon, Settings, type LucideIcon } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import DreamEntryLauncher from "./DreamEntryLauncher";

type Tab = { href: string; label: string; icon: LucideIcon };

const LEFT_TABS: Tab[] = [
  { href: "/home", label: "おうち", icon: House },
  { href: "/forest", label: "もり", icon: Trees },
];
const RIGHT_TABS: Tab[] = [
  { href: "/my-dreams", label: "マイ夢", icon: Moon },
  { href: "/settings", label: "設定", icon: Settings },
];

/**
 * モバイル専用のボトムタブバー。ログイン時だけ表示し、中央に記録FAB（DreamEntryLauncher）を置く。
 * デスクトップ（md以上）は現行Headerに任せるため md:hidden。
 * nav には backdrop-filter / transform を付けない（DreamEntryLauncherの fixed モーダルを壊さないため）。
 */
export default function BottomTabBar(): React.JSX.Element | null {
  const pathname = usePathname();
  const { authStatus, isLoggedIn } = useAuth();

  if (authStatus === "checking" || !isLoggedIn) return null;

  const renderTab = ({ href, label, icon: Icon }: Tab) => {
    const active =
      pathname === href || (href !== "/" && (pathname?.startsWith(href) ?? false));
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-semibold transition-colors ${
          active ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Icon size={22} aria-hidden />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* コンテンツがバーに隠れないようにする下スペーサー（ログイン時・モバイルのみ） */}
      <div
        aria-hidden
        className="h-[calc(env(safe-area-inset-bottom)+4.5rem)] md:hidden"
      />
      <nav
        aria-label="メインナビゲーション"
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border bg-background px-2 pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {LEFT_TABS.map(renderTab)}

        <div className="flex flex-1 items-start justify-center">
          <DreamEntryLauncher
            buttonLabel="夢をきろくする"
            buttonClassName="-mt-6 h-14 w-14 justify-center rounded-full bg-primary text-primary-foreground shadow-lg [&>span]:sr-only"
            showSparkles
          />
        </div>

        {RIGHT_TABS.map(renderTab)}
      </nav>
    </>
  );
}
```

- [ ] **Step 4: テストを実行して成功を確認**

Run: `cd frontend && yarn jest __tests__/components/BottomTabBar.test.tsx`
Expected: PASS（4テスト緑）

- [ ] **Step 5: コミット**

```bash
cd frontend && git add app/components/BottomTabBar.tsx __tests__/components/BottomTabBar.test.tsx
git commit -m "feat: モバイル用ボトムタブバーを追加

おうち/もり/[＋きろくFAB]/マイ夢/設定。認証時のみ表示・md:hidden。
FABは既存DreamEntryLauncherを再利用。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: layout.tsx へのマウントと検証

**Files:**
- Modify: `frontend/app/layout.tsx`（`BottomTabBar` を import し `<Providers>` 内・`<PendingDreamsMonitor />` の後に追加）

**Interfaces:**
- Consumes: `BottomTabBar`（Task 1、`./components/BottomTabBar`、default export、props無し）

- [ ] **Step 1: `layout.tsx` に import を追加**

`frontend/app/layout.tsx` の import 群（`import PendingDreamsMonitor from "./components/PendingDreamsMonitor";` の直後）に追加:

```tsx
import BottomTabBar from "./components/BottomTabBar";
```

- [ ] **Step 2: `<BottomTabBar />` をマウント**

`frontend/app/layout.tsx` の既存:

```tsx
          <PendingDreamsMonitor />
        </Providers>
```

を以下に変更（`<PendingDreamsMonitor />` の直後に1行追加。他は不変更）:

```tsx
          <PendingDreamsMonitor />
          <BottomTabBar />
        </Providers>
```

- [ ] **Step 3: 完了ゲート（全テスト＋ビルド）**

```bash
cd frontend && yarn jest && yarn build
```
Expected: Jest 全緑（既存311 + 新規4）、`yarn build` 成功。

> 注: このリポジトリには `app/forest/[profileId]/page.tsx` の named export 起因の既存tsc型エラーが別途あり得る（#2変更とは無関係）。`yarn build` が当該既存エラーで止まる場合は、webpackコンパイルが通り、かつ #2 で触れた `BottomTabBar.tsx` / `layout.tsx` に新規型エラーが無いことを確認すれば本タスクのゲートは満たす（既存エラーは別タスクで対応）。

- [ ] **Step 4: preview目視（公開ページで検証可能な範囲）**

preview を起動し:
- `/login`（未認証）で**ボトムバーが表示されない**こと。
- モバイル幅（~390px）で `/login` のレイアウトが崩れないこと。
- デスクトップ幅で `Header` が従来どおりで、ボトムバーが出ないこと（`md:hidden`）。

> 認証済み画面でのバー表示・FAB・アクティブ状態は `isLoggedIn` 依存のため component test で担保済み。実機タップ感は手動QAに委ねる（spec §4の限界）。

- [ ] **Step 5: コミット**

```bash
cd frontend && git add app/layout.tsx
git commit -m "feat: ボトムタブバーをlayoutにマウント

認証時のみモバイルで表示。デスクトップは現行Header維持。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage（仕様→タスク対応）:**
- §2.1 BottomTabBar（表示条件/レイアウト/タブ/アクティブ/FAB/a11y）→ Task 1 ✓
- §2.2 layout.tsx 組み込み → Task 2 ✓（spec §2.2の「wrapperへ下padding」は、認証連動性とデスクトップ不変のため**BottomTabBar内スペーサー**に改善。意図＝「コンテンツがバーに隠れない／デスクトップ不変」は満たす）
- §3 テスト（null×2 / 4タブ＋FAB / アクティブ）→ Task 1 のテスト ✓
- §4 検証（build/jest/公開ページpreview）→ Task 2 Step 3-4 ✓
- §6 リスク①md:pb-0/desktop不変 → スペーサーmd:hidden＋layout padding不変更で担保 ✓
- §6 リスク②FABモーダルのstacking → navに backdrop-filter/transform を付けない（Global Constraints）で回避 ✓
- §6 リスク③ログアウト即時消滅 → `useAuth` の `isLoggedIn` 依存で自動 ✓
- §6 リスク④home記録導線の重複増加 → 新モーダルを作らず既存ランチャー再利用、home個別調整は#3 ✓（本PRで重複を増やさない）

**2. Placeholder scan:** TBD/TODO・曖昧指示なし。全コードブロックに実コードを記載 ✓

**3. Type consistency:** `BottomTabBar` は props無し default export（Task 1 Produces ＝ Task 2 Consumes 一致）。`useAuth()` 形は `{ authStatus, isLoggedIn }`、`DreamEntryLauncher` props（`buttonLabel`/`buttonClassName`/`showSparkles`）は実コードと一致 ✓

**注記（spec deviation）:** spec §2.2 は「本文ラッパにモバイル下padding」だったが、本プランでは **`BottomTabBar` 内の `md:hidden` スペーサー**に変更した。理由＝(1)ログイン時だけ余白が要る（公開ページに余白を残さない）、(2)`layout.tsx` 本体を不変更にしデスクトップをピクセル不変に保てる。実装後に spec §2.2 を同主旨へ追記してよい。
