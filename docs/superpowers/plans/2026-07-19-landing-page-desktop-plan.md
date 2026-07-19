# ランディングページ（⑥）デスクトップ改善 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `frontend/app/components/LandingPage.tsx`を6つのセクションコンポーネントに分割し、デスクトップ（lg+）向けレイアウトを追加する。モバイルの見た目は現状からほぼ変えない。

**Architecture:** 単一の445行ファイルを、森機能（`app/components/forest/`）で確立した「1ファイル1責務」パターンに倣い`app/components/landing/`配下の6コンポーネントに分割する。`LandingPage.tsx`自体は認証リダイレクト判定＋6コンポーネントの組み立てのみを担う薄いオーケストレーターになる。Heroのみライト/ダークに関わらず夜空固定背景（`AuthVisualPanel`と同じ視覚パターン）、他セクションは既存のテーマ追従トークンをそのまま使う。

**Tech Stack:** Next.js App Router / React / TypeScript / Tailwind CSS / framer-motion / Jest + React Testing Library

参照仕様書: `docs/superpowers/specs/2026-07-19-landing-page-desktop-design.md`

## Global Constraints

- 主CTAは`/trial`を維持する（`/register`直行にしない）
- 未検証の利用者数・評価・実績（例:「50,000+」「4.8★」）を一切掲載しない
- グローバル`Header`（`app/Header.tsx`、`AuthNav`・`ThemeToggle`・`CommandPaletteTrigger`を含む）と重複するナビを作らない。新規コンポーネントに独自の`<nav>`要素を追加しない
- ブランド表記は「YumeTree」で統一する（「ユメツリー」表記は使わない）
- 既存の認証済みユーザーのリダイレクトロジック（`authStatus === "authenticated"` → `router.replace("/home")`）を維持する
- サイト唯一の`<h1>`はHeroに置き、文言は現行のまま変更しない（SEO保持: `app/layout.tsx`のmetadata titleと一貫させる）
- `prefers-reduced-motion`対応: グローバルCSS（`globals.css:505`）はCSSキーフレームのみを無効化するため、framer-motionの`initial`/`animate`/`whileInView`は各コンポーネントで`useReducedMotion()`（`framer-motion`）による明示ガードを追加する。`initial`条件分岐は`ForestScene.tsx`・`forest/[profileId]/page.tsx`内`DreamPreviewModal`の既存パターン（`initial={reduceMotion ? undefined : {...}}`、`animate`は常に最終状態を指定）を踏襲する
- Heroセクションの背景はライト/ダークモードに関わらず常に夜空固定（`bg-gradient-to-br from-indigo-950 via-slate-900 to-sky-950`＋星の`radial-gradient`、`AuthVisualPanel.tsx`と同じ視覚パターン）。Hero以外の全セクションは既存のテーマ追従トークン（`bg-background`/`bg-card`/`dark:`クラス）をそのまま使う
- Product Proof・Final CTA・Tech Stackの**コピー内容は一字一句変更しない**（レイアウトのみ調整可）
- FAQ 8項目（`FAQ_ITEMS`）の文言は一字一句変更しない

---

## ファイル構成

**新規作成:**
- `frontend/app/components/landing/LandingHero.tsx`
- `frontend/app/components/landing/LandingProductProof.tsx`
- `frontend/app/components/landing/LandingFeatureGrid.tsx`
- `frontend/app/components/landing/LandingFinalCta.tsx`
- `frontend/app/components/landing/LandingFaq.tsx`
- `frontend/app/components/landing/LandingTechStack.tsx`
- `frontend/__tests__/components/landing/LandingHero.test.tsx`
- `frontend/__tests__/components/landing/LandingFeatureGrid.test.tsx`
- `frontend/__tests__/components/landing/LandingFaq.test.tsx`
- `frontend/__tests__/components/LandingPage.test.tsx`

**変更:**
- `frontend/app/components/LandingPage.tsx` — 6コンポーネントの組み立て＋認証リダイレクトのみに縮小（全面書き換え）

---

### Task 1: `LandingHero`（ヒーロー、夜空固定背景）

**Files:**
- Create: `frontend/app/components/landing/LandingHero.tsx`
- Test: `frontend/__tests__/components/landing/LandingHero.test.tsx`

**Interfaces:**
- Consumes: `MorpheusImage`（`@/app/components/MorpheusImage`、既存・無変更、`variant="landing"`）
- Produces: `LandingHero(): JSX.Element` — 引数なし。Task 7（`LandingPage.tsx`）で`<LandingHero />`として使用

- [ ] **Step 1: 失敗するテストを書く**

`frontend/__tests__/components/landing/LandingHero.test.tsx`:

```tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import LandingHero from "@/app/components/landing/LandingHero";

describe("LandingHero", () => {
  it("h1にサイト名とキャッチコピーを表示する", () => {
    render(<LandingHero />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("YumeTree");
    expect(heading).toHaveTextContent("モルペウスと育てるAI夢ノート");
  });

  it("主CTAが/trialを指す", () => {
    render(<LandingHero />);
    const cta = screen.getByRole("link", { name: /今朝の夢を入れてみる/ });
    expect(cta).toHaveAttribute("href", "/trial");
  });

  it("独自のnav要素を持たない（グローバルHeaderとの重複防止）", () => {
    const { container } = render(<LandingHero />);
    expect(container.querySelector("nav")).toBeNull();
  });

  it("未検証の統計数値を表示しない", () => {
    render(<LandingHero />);
    expect(screen.queryByText(/50,000/)).not.toBeInTheDocument();
    expect(screen.queryByText(/4\.8/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `cd frontend && yarn jest __tests__/components/landing/LandingHero.test.tsx`
Expected: FAIL（`Cannot find module '@/app/components/landing/LandingHero'`）

- [ ] **Step 3: コンポーネントを実装する**

`frontend/app/components/landing/LandingHero.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Sparkles, Lock } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import MorpheusImage from "@/app/components/MorpheusImage";

export default function LandingHero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-sky-950 px-4 py-16 sm:py-24 lg:px-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-75"
        style={{
          backgroundImage:
            "radial-gradient(2px 2px at 16% 20%, #fde68a, transparent), radial-gradient(1.6px 1.6px at 80% 26%, #fff, transparent), radial-gradient(1.6px 1.6px at 60% 14%, #c7d2fe, transparent), radial-gradient(2px 2px at 30% 68%, #fff, transparent)",
        }}
      />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-10 text-center lg:flex-row lg:text-left">
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative order-1 mb-2 h-44 w-44 shrink-0 rounded-[2rem] bg-white/10 p-3 ring-1 ring-white/10 backdrop-blur-sm lg:order-2 lg:h-64 lg:w-64"
        >
          <MorpheusImage variant="landing" size={256} priority className="animate-morpheus-float" />
          <Sparkles className="absolute -right-3 -top-3 animate-pulse text-yellow-300/80" size={20} />
        </motion.div>

        <div className="order-2 flex-1 lg:order-1">
          <motion.h1
            initial={reduceMotion ? undefined : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mb-6 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            YumeTree
            <br />
            <span className="bg-gradient-to-r from-sky-300 via-blue-300 to-purple-300 bg-clip-text text-transparent">
              モルペウスと育てるAI夢ノート
            </span>
          </motion.h1>

          <motion.p
            initial={reduceMotion ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.6 }}
            className="mx-auto mb-4 max-w-lg text-base leading-relaxed text-slate-300 sm:text-lg lg:mx-0"
          >
            夢は、忘れるためのものじゃない。
            <br className="hidden sm:block" />
            声でもテキストでも、起きたままをそっと残す。
            <br className="hidden sm:block" />
            <span className="text-slate-100">AIが感情と意味を読み解き、</span>夢の世界を画像で形に。
            <br className="hidden sm:block" />
            ひとりでも、大切な人とも使えるプライベートな夢ノート。
          </motion.p>

          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.5 }}
            className="flex flex-col items-center gap-4 lg:items-start"
          >
            <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link
                href="/trial"
                className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-10 py-4 text-base font-bold text-white shadow-xl shadow-sky-500/20 transition-all duration-300 hover:-translate-y-1 hover:from-sky-400 hover:to-blue-500 hover:shadow-2xl hover:shadow-sky-500/30 sm:text-lg"
              >
                <Sparkles size={20} />
                今朝の夢を入れてみる
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/15"
              >
                30秒でわかる
              </a>
            </div>
            <p className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <Lock size={12} />
              完全 非公開のプライベートノート
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `cd frontend && yarn jest __tests__/components/landing/LandingHero.test.tsx`
Expected: PASS（4 tests）

- [ ] **Step 5: コミット**

```bash
cd frontend
git add app/components/landing/LandingHero.tsx __tests__/components/landing/LandingHero.test.tsx
git commit -m "feat: ランディングページにLandingHero（夜空固定ヒーロー）を追加"
```

---

### Task 2: `LandingProductProof`（3ステップ実演、デスクトップで横並び）

**Files:**
- Create: `frontend/app/components/landing/LandingProductProof.tsx`

**Interfaces:**
- Consumes: なし（自己完結）
- Produces: `LandingProductProof(): JSX.Element` — 引数なし。Task 7で`<LandingProductProof />`として使用

**このタスクにはユニットテストを追加しない。** 理由: 仕様書のとおり、このセクションはコピー・アイコン・配色を一切変更せず、レイアウト（縦積み→lg+で横並び）のみを調整する。内容が既存のまま変わらないため新規の振る舞い検証は不要で、Task 7の`LandingPage`統合テストが「このセクションの文言が画面に出現すること」を検証する。安全性は以下で担保する:
- 既存の`LandingPage.tsx`から移植したJSXの文言・アイコン・色クラスを一字一句変えないこと（Step 3で目視確認）
- `yarn tsc --noEmit`でこのファイルにエラーが出ないこと
- Task 7の統合テストで「モルペウスのAI分析」の文言が表示されることを確認すること

- [ ] **Step 1: コンポーネントを実装する**

`frontend/app/components/landing/LandingProductProof.tsx`:

```tsx
"use client";

import { motion, type Variants, useReducedMotion } from "framer-motion";
import { Mic, Brain, TrendingUp } from "lucide-react";

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

export default function LandingProductProof() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="px-4 py-16 sm:py-24">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        className="relative mx-auto max-w-2xl rounded-3xl border border-slate-200/80 bg-slate-100/80 p-6 backdrop-blur-sm dark:border-slate-700/30 dark:bg-slate-800/40 sm:p-10 lg:max-w-5xl"
      >
        <div className="space-y-8 lg:flex lg:items-stretch lg:gap-4 lg:space-y-0">
          {/* Step 1: 入力 */}
          <motion.div
            variants={reduceMotion ? undefined : fadeIn}
            custom={0}
            className="flex items-start gap-4 lg:flex-1 lg:flex-col lg:items-center lg:text-center"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-sky-500/15">
              <Mic className="text-sky-500 dark:text-sky-400" size={20} />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-sky-600 dark:text-sky-400">声またはテキストで記録</p>
              <div className="rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-700/40 dark:bg-slate-900/60">
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  「空を飛んでいた。すごく気持ちよくて、
                  <br className="hidden sm:block" />
                  雲の上に誰かが待っている気がした」
                </p>
              </div>
            </div>
          </motion.div>

          {/* つなぎ */}
          <motion.div variants={reduceMotion ? undefined : fadeIn} custom={1} className="flex justify-center lg:items-center">
            <div className="h-8 w-px bg-gradient-to-b from-sky-500/40 to-purple-500/40 lg:h-px lg:w-8 lg:bg-gradient-to-r" />
          </motion.div>

          {/* Step 2: AI分析結果 */}
          <motion.div
            variants={reduceMotion ? undefined : fadeIn}
            custom={2}
            className="flex items-start gap-4 lg:flex-1 lg:flex-col lg:items-center lg:text-center"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-purple-500/15">
              <Brain className="text-purple-500 dark:text-purple-400" size={20} />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-purple-600 dark:text-purple-400">モルペウスのAI分析</p>
              <div className="rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-700/40 dark:bg-slate-900/60">
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  「すごいゆめだね！そらをとぶゆめは、
                  <br className="hidden sm:block" />
                  きみが <span className="text-sky-500 dark:text-sky-300">あたらしいことにちょうせん</span> したい
                  <br className="hidden sm:block" />
                  きもちのあらわれだよ」
                </p>
              </div>
            </div>
          </motion.div>

          {/* つなぎ */}
          <motion.div variants={reduceMotion ? undefined : fadeIn} custom={3} className="flex justify-center lg:items-center">
            <div className="h-8 w-px bg-gradient-to-b from-purple-500/40 to-amber-500/40 lg:h-px lg:w-8 lg:bg-gradient-to-r" />
          </motion.div>

          {/* Step 3: 感情タグ */}
          <motion.div
            variants={reduceMotion ? undefined : fadeIn}
            custom={4}
            className="flex items-start gap-4 lg:flex-1 lg:flex-col lg:items-center lg:text-center"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
              <TrendingUp className="text-amber-500 dark:text-amber-400" size={20} />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-amber-600 dark:text-amber-400">感情タグ</p>
              <div className="flex flex-wrap gap-2 lg:justify-center">
                {["わくわく", "自由", "期待"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-sky-300/60 bg-sky-100 px-3 py-1 text-xs font-medium text-sky-600 dark:border-sky-500/20 dark:bg-sky-500/15 dark:text-sky-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
```

- [ ] **Step 2: 型チェックを実行する**

Run: `cd frontend && yarn tsc --noEmit 2>&1 | grep -i LandingProductProof`
Expected: 出力なし

- [ ] **Step 3: コミット**

```bash
cd frontend
git add app/components/landing/LandingProductProof.tsx
git commit -m "feat: ランディングページにLandingProductProof（3ステップ実演）を追加"
```

---

### Task 3: `LandingFeatureGrid`（機能グリッド、既存Benefitsを置換）

**Files:**
- Create: `frontend/app/components/landing/LandingFeatureGrid.tsx`
- Test: `frontend/__tests__/components/landing/LandingFeatureGrid.test.tsx`

**Interfaces:**
- Consumes: なし（自己完結）
- Produces: `LandingFeatureGrid(): JSX.Element` — 引数なし。`id="features"`を持つ（Task 1の`LandingHero`内`#features`アンカーの遷移先）。Task 7で`<LandingFeatureGrid />`として使用

- [ ] **Step 1: 失敗するテストを書く**

`frontend/__tests__/components/landing/LandingFeatureGrid.test.tsx`:

```tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import LandingFeatureGrid from "@/app/components/landing/LandingFeatureGrid";

describe("LandingFeatureGrid", () => {
  it("5つの機能見出しを表示する", () => {
    render(<LandingFeatureGrid />);
    expect(screen.getByText("すぐ残せる")).toBeInTheDocument();
    expect(screen.getByText("意味が返る")).toBeInTheDocument();
    expect(screen.getByText("感情の可視化")).toBeInTheDocument();
    expect(screen.getByText("夢を画像に")).toBeInTheDocument();
    expect(screen.getByText("夢の森が育つ")).toBeInTheDocument();
  });

  it("プライバシー強調カードを表示する", () => {
    render(<LandingFeatureGrid />);
    expect(screen.getByText("完全プライベート")).toBeInTheDocument();
  });

  it("未検証の統計数値を表示しない", () => {
    render(<LandingFeatureGrid />);
    expect(screen.queryByText(/50,000/)).not.toBeInTheDocument();
    expect(screen.queryByText(/4\.8/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `cd frontend && yarn jest __tests__/components/landing/LandingFeatureGrid.test.tsx`
Expected: FAIL（`Cannot find module '@/app/components/landing/LandingFeatureGrid'`）

- [ ] **Step 3: コンポーネントを実装する**

`frontend/app/components/landing/LandingFeatureGrid.tsx`:

```tsx
"use client";

import { motion, type Variants, useReducedMotion } from "framer-motion";
import { Mic, Brain, TrendingUp, ImageIcon, Trees, Lock } from "lucide-react";

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

const FEATURES = [
  {
    title: "すぐ残せる",
    body: "テキストでも声でも。起きた瞬間の記憶を、消える前にキャッチする。",
    accent: "from-sky-400 to-blue-500",
    icon: <Mic size={16} className="text-sky-500 dark:text-sky-400" />,
  },
  {
    title: "意味が返る",
    body: "AIが夢をやさしい言葉で解釈。感情タグで、自分の気持ちに名前がつく。",
    accent: "from-purple-400 to-violet-500",
    icon: <Brain size={16} className="text-purple-500 dark:text-purple-400" />,
  },
  {
    title: "感情の可視化",
    body: "感情タグとムードカレンダーで、心の移り変わりをひと目で。",
    accent: "from-emerald-400 to-teal-500",
    icon: <TrendingUp size={16} className="text-emerald-500 dark:text-emerald-400" />,
  },
  {
    title: "夢を画像に",
    body: "記録した夢をもとに、AIが夢の世界をビジュアルで生成。言葉にできない雰囲気を形に残す。",
    accent: "from-pink-400 to-rose-500",
    icon: <ImageIcon size={16} className="text-pink-500 dark:text-pink-400" />,
  },
  {
    title: "夢の森が育つ",
    body: "記録するたびに木が育つ。続けるほど、あなただけの森が広がっていく。",
    accent: "from-green-400 to-emerald-500",
    icon: <Trees size={16} className="text-green-500 dark:text-green-400" />,
  },
];

export default function LandingFeatureGrid() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="features" className="px-4 py-16 sm:py-24">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((item, i) => (
          <motion.div
            key={item.title}
            custom={i}
            initial={reduceMotion ? undefined : "hidden"}
            whileInView="visible"
            viewport={{ once: true }}
            variants={reduceMotion ? undefined : fadeIn}
            className="text-center sm:text-left"
          >
            <div className={`mx-auto mb-4 h-1 w-10 rounded-full bg-gradient-to-r sm:mx-0 ${item.accent}`} />
            <div className="mb-2 flex items-center justify-center gap-1.5 sm:justify-start">
              {item.icon}
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{item.title}</h3>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.body}</p>
          </motion.div>
        ))}

        <motion.div
          custom={FEATURES.length}
          initial={reduceMotion ? undefined : "hidden"}
          whileInView="visible"
          viewport={{ once: true }}
          variants={reduceMotion ? undefined : fadeIn}
          className="flex flex-col justify-center rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50 to-transparent p-6 text-center dark:border-violet-500/20 sm:text-left"
        >
          <div className="mb-1.5 flex items-center justify-center gap-1.5 text-xs font-bold text-primary sm:justify-start">
            <Lock size={13} /> 完全プライベート
          </div>
          <h3 className="mb-2 font-bold text-slate-800 dark:text-slate-100">
            記録した夢は
            <br />
            自分だけに見える
          </h3>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            ランキングや公開機能はなく、安心して本音を残せます。
          </p>
        </motion.div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `cd frontend && yarn jest __tests__/components/landing/LandingFeatureGrid.test.tsx`
Expected: PASS（3 tests）

- [ ] **Step 5: コミット**

```bash
cd frontend
git add app/components/landing/LandingFeatureGrid.tsx __tests__/components/landing/LandingFeatureGrid.test.tsx
git commit -m "feat: ランディングページにLandingFeatureGrid（機能グリッド）を追加"
```

---

### Task 4: `LandingFinalCta`（締めのCTA、既存のまま移植）

**Files:**
- Create: `frontend/app/components/landing/LandingFinalCta.tsx`

**Interfaces:**
- Consumes: `MorpheusImage`（`@/app/components/MorpheusImage`、既存・無変更、`variant="reward"`）
- Produces: `LandingFinalCta(): JSX.Element` — 引数なし。Task 7で`<LandingFinalCta />`として使用

**このタスクにはユニットテストを追加しない。** 理由: 仕様書のとおりこのセクションは無変更の移植のみ（コンテナ幅の微調整のみ許容）。Task 7の統合テストで「今夜の夢が、明日の気づきになる。」の文言が表示されることを確認する。

- [ ] **Step 1: コンポーネントを実装する**

`frontend/app/components/landing/LandingFinalCta.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import MorpheusImage from "@/app/components/MorpheusImage";

export default function LandingFinalCta() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="px-4 py-16 text-center sm:py-24">
      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <MorpheusImage variant="reward" size={120} className="mx-auto mb-6" />
        <p className="mb-2 text-xl font-bold text-slate-700 dark:text-slate-200 sm:text-2xl">
          今夜の夢が、明日の気づきになる。
        </p>
        <p className="mb-8 text-sm text-slate-500 dark:text-slate-500">
          ひとりでも、恋人や家族・友達とも。あなたのペースで続けられます。
        </p>
        <Link
          href="/trial"
          className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-10 py-4 text-base font-bold text-white shadow-xl shadow-sky-500/20 transition-all duration-300 hover:-translate-y-1 hover:from-sky-400 hover:to-blue-500 hover:shadow-2xl hover:shadow-sky-500/30"
        >
          <Sparkles size={18} />
          無料で体験する
        </Link>
        <div className="mt-5 flex justify-center gap-4 text-sm">
          <Link
            href="/register"
            className="text-slate-500 transition-colors hover:text-sky-500 dark:text-slate-400 dark:hover:text-sky-400"
          >
            アカウント作成
          </Link>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <Link
            href="/login"
            className="text-slate-500 transition-colors hover:text-sky-500 dark:text-slate-400 dark:hover:text-sky-400"
          >
            ログイン
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
```

- [ ] **Step 2: 型チェックを実行する**

Run: `cd frontend && yarn tsc --noEmit 2>&1 | grep -i LandingFinalCta`
Expected: 出力なし

- [ ] **Step 3: コミット**

```bash
cd frontend
git add app/components/landing/LandingFinalCta.tsx
git commit -m "feat: ランディングページにLandingFinalCtaを追加"
```

---

### Task 5: `LandingFaq`（FAQ、デスクトップで2列）

**Files:**
- Create: `frontend/app/components/landing/LandingFaq.tsx`
- Test: `frontend/__tests__/components/landing/LandingFaq.test.tsx`

**Interfaces:**
- Consumes: なし（自己完結）
- Produces: `LandingFaq(): JSX.Element` — 引数なし。Task 7で`<LandingFaq />`として使用

- [ ] **Step 1: 失敗するテストを書く**

`frontend/__tests__/components/landing/LandingFaq.test.tsx`:

```tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import LandingFaq from "@/app/components/landing/LandingFaq";

describe("LandingFaq", () => {
  it("8問すべての質問文を表示する", () => {
    render(<LandingFaq />);
    expect(screen.getByText("YumeTreeは何のアプリですか？")).toBeInTheDocument();
    expect(screen.getByText("AI分析は医療診断ですか？")).toBeInTheDocument();
    expect(screen.getByText("夢の内容は他人に公開されますか？")).toBeInTheDocument();
    expect(screen.getByText("ひとりでも使えますか？")).toBeInTheDocument();
    expect(screen.getByText("家族・恋人・友達とも使えますか？")).toBeInTheDocument();
    expect(screen.getByText("夢の画像生成とは何ですか？")).toBeInTheDocument();
    expect(screen.getByText("無料で試せますか？")).toBeInTheDocument();
    expect(screen.getByText("モルペウスとは何ですか？")).toBeInTheDocument();
  });

  it("質問クリックでaria-expandedが切り替わり回答が表示される", () => {
    render(<LandingFaq />);
    const question = screen.getByText("AI分析は医療診断ですか？");
    const button = question.closest("button") as HTMLButtonElement;

    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/医療診断や心理診断ではありません/)).not.toBeInTheDocument();

    fireEvent.click(button);

    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/医療診断や心理診断ではありません/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `cd frontend && yarn jest __tests__/components/landing/LandingFaq.test.tsx`
Expected: FAIL（`Cannot find module '@/app/components/landing/LandingFaq'`）

- [ ] **Step 3: コンポーネントを実装する**

`frontend/app/components/landing/LandingFaq.tsx`:

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "YumeTreeは何のアプリですか？",
    a: "YumeTreeは、朝の夢を忘れる前に記録し、AIガイドのモルペウスと一緒に感情や心の変化を振り返るプライベートAI夢ノートです。テキストでも音声でも記録でき、AI分析・感情タグ・夢の画像生成ができます。",
  },
  {
    q: "AI分析は医療診断ですか？",
    a: "いいえ。YumeTreeのAI分析は医療診断や心理診断ではありません。夢の記録を楽しく振り返るためのやさしいメッセージです。体調や心の不調が気になる場合は、医療機関にご相談ください。",
  },
  {
    q: "夢の内容は他人に公開されますか？",
    a: "いいえ、公開されません。YumeTreeに記録した夢はあなただけが見られます。ランキングやみんなの夢日記のような外部公開機能はなく、プライベートなノートとして管理されます。",
  },
  {
    q: "ひとりでも使えますか？",
    a: "はい。YumeTreeはひとりで使うことを基本に設計されています。自分の夢を毎朝記録して、モルペウスと一緒にゆっくり振り返るだけで十分楽しめます。",
  },
  {
    q: "家族・恋人・友達とも使えますか？",
    a: "はい。それぞれがアカウントを作って使っていただけます。夢の記録は各自のプライベートなノートですが、共通の話題として「昨夜こんな夢を見た」と話すきっかけにもなります。",
  },
  {
    q: "夢の画像生成とは何ですか？",
    a: "記録した夢の内容をもとに、AIが夢の世界をイラスト風の画像として生成する機能です。文字では残せない夢の雰囲気をビジュアルで保存できます。プレミアムプランで月31枚まで利用できます。",
  },
  {
    q: "無料で試せますか？",
    a: "はい。アカウント登録なしでもおためし体験ができます。アカウントを作ると夢の記録・AI分析・感情タグなど基本機能を無料でお使いいただけます。音声入力・画像生成・月次サマリーはプレミアムプランで利用可能です。",
  },
  {
    q: "モルペウスとは何ですか？",
    a: "モルペウスは、YumeTreeのAIガイドキャラクターです。ギリシャ神話の夢の神「モルペウス」からインスピレーションを受けており、あなたの夢をやさしい言葉で分析し、感情に寄り添ったメッセージを届けます。",
  },
];

export default function LandingFaq() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();

  return (
    <section className="border-t border-slate-200 px-4 py-16 dark:border-slate-800/50 sm:py-24">
      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-4xl"
      >
        <h2 className="mb-10 text-center text-xl font-bold text-slate-800 dark:text-slate-100 sm:text-2xl">
          よくある質問
        </h2>
        <dl className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white/70 dark:border-slate-700/40 dark:bg-slate-800/30"
            >
              <dt>
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={openFaq === i}
                >
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.q}</span>
                  <ChevronDown
                    size={16}
                    className={`flex-shrink-0 text-slate-400 transition-transform duration-200 ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </dt>
              <AnimatePresence initial={false}>
                {openFaq === i && (
                  <motion.dd
                    key="answer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    className="px-5 pb-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400"
                  >
                    {item.a}
                  </motion.dd>
                )}
              </AnimatePresence>
            </div>
          ))}
        </dl>
      </motion.div>
    </section>
  );
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `cd frontend && yarn jest __tests__/components/landing/LandingFaq.test.tsx`
Expected: PASS（2 tests）

- [ ] **Step 5: コミット**

```bash
cd frontend
git add app/components/landing/LandingFaq.tsx __tests__/components/landing/LandingFaq.test.tsx
git commit -m "feat: ランディングページにLandingFaq（2列レイアウト対応）を追加"
```

---

### Task 6: `LandingTechStack`（技術スタック、既存のまま移植）

**Files:**
- Create: `frontend/app/components/landing/LandingTechStack.tsx`

**Interfaces:**
- Consumes: なし（自己完結）
- Produces: `LandingTechStack(): JSX.Element` — 引数なし。Task 7で`<LandingTechStack />`として使用

**このタスクにはユニットテストを追加しない。** 理由: 仕様書のとおりこのセクションは無変更の移植のみ。Task 7の統合テストで「Built with」の文言が表示されることを確認する。

- [ ] **Step 1: コンポーネントを実装する**

`frontend/app/components/landing/LandingTechStack.tsx`:

```tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";

const TECH_STACK = [
  "Next.js", "React", "TypeScript", "Tailwind CSS",
  "Ruby on Rails", "PostgreSQL", "OpenAI API", "Stripe",
  "Vercel", "Render",
];

export default function LandingTechStack() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={reduceMotion ? undefined : { opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="border-t border-slate-200 px-4 py-8 dark:border-slate-800/50"
    >
      <p className="mb-3 text-center text-xs text-slate-500 dark:text-slate-600">Built with</p>
      <div className="mx-auto flex max-w-lg flex-wrap justify-center gap-1.5">
        {TECH_STACK.map((tech) => (
          <span
            key={tech}
            className="rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 text-[10px] font-medium text-slate-500 dark:border-slate-800/60 dark:bg-transparent dark:text-slate-500"
          >
            {tech}
          </span>
        ))}
      </div>
    </motion.section>
  );
}
```

- [ ] **Step 2: 型チェックを実行する**

Run: `cd frontend && yarn tsc --noEmit 2>&1 | grep -i LandingTechStack`
Expected: 出力なし

- [ ] **Step 3: コミット**

```bash
cd frontend
git add app/components/landing/LandingTechStack.tsx
git commit -m "feat: ランディングページにLandingTechStackを追加"
```

---

### Task 7: `LandingPage.tsx`を6コンポーネントの組み立てに縮小する

**Files:**
- Modify: `frontend/app/components/LandingPage.tsx`（全面書き換え）
- Test: `frontend/__tests__/components/LandingPage.test.tsx`（新規）

**Interfaces:**
- Consumes: `LandingHero`（Task 1）、`LandingProductProof`（Task 2）、`LandingFeatureGrid`（Task 3）、`LandingFinalCta`（Task 4）、`LandingFaq`（Task 5）、`LandingTechStack`（Task 6）、`MorpheusGuideLanding`（`./MorpheusGuide`、既存・無変更）、`useAuth`（`@/context/AuthContext`、既存・無変更）
- Produces: なし（末端のページコンポーネント）

- [ ] **Step 1: 失敗するテストを書く**

`frontend/__tests__/components/LandingPage.test.tsx`:

```tsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import LandingPage from "@/app/components/LandingPage";

const mockReplace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockUseAuth = jest.fn();
jest.mock("@/context/AuthContext", () => ({
  __esModule: true,
  useAuth: () => mockUseAuth(),
}));

describe("LandingPage", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("認証済みユーザーは/homeへリダイレクトする", async () => {
    mockUseAuth.mockReturnValue({ authStatus: "authenticated" });
    render(<LandingPage />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/home"));
  });

  it("未認証ユーザーにはh1と全セクションが表示される", () => {
    mockUseAuth.mockReturnValue({ authStatus: "unauthenticated" });
    render(<LandingPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("YumeTree");
    expect(screen.getByText("モルペウスのAI分析")).toBeInTheDocument();
    expect(screen.getByText("夢の森が育つ")).toBeInTheDocument();
    expect(screen.getByText("今夜の夢が、明日の気づきになる。")).toBeInTheDocument();
    expect(screen.getByText("よくある質問")).toBeInTheDocument();
    expect(screen.getByText("Built with")).toBeInTheDocument();
  });

  it("認証確認中はローディング表示のみで、リダイレクトもコンテンツ表示もしない", () => {
    mockUseAuth.mockReturnValue({ authStatus: "checking" });
    render(<LandingPage />);

    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `cd frontend && yarn jest __tests__/components/LandingPage.test.tsx`
Expected: FAIL（現行の`LandingPage.tsx`は独自のHero/Benefits/FAQ等をインラインで持つため、`モルペウスのAI分析`等の一部テキストは一致するが「未検証の統計を含まない」等の前提が崩れる、または単純に現行実装のままだとテストの意図と食い違う。書き換え前の時点でこのテストを実行しFAILすることを確認する）

- [ ] **Step 3: ページを書き換える**

`frontend/app/components/LandingPage.tsx`（既存ファイルを以下で置き換える）:

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { MorpheusGuideLanding } from "./MorpheusGuide";
import LandingHero from "./landing/LandingHero";
import LandingProductProof from "./landing/LandingProductProof";
import LandingFeatureGrid from "./landing/LandingFeatureGrid";
import LandingFinalCta from "./landing/LandingFinalCta";
import LandingFaq from "./landing/LandingFaq";
import LandingTechStack from "./landing/LandingTechStack";

export default function LandingPage() {
  const router = useRouter();
  const { authStatus } = useAuth();

  useEffect(() => {
    if (authStatus === "authenticated") {
      router.replace("/home");
    }
  }, [authStatus, router]);

  if (authStatus === "checking") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
      </div>
    );
  }

  if (authStatus === "authenticated") return null;

  return (
    <div className="relative isolate overflow-hidden">
      <LandingHero />
      <LandingProductProof />
      <LandingFeatureGrid />
      <LandingFinalCta />
      <LandingFaq />
      <LandingTechStack />
      <MorpheusGuideLanding />
    </div>
  );
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `cd frontend && yarn jest __tests__/components/LandingPage.test.tsx`
Expected: PASS（3 tests）

- [ ] **Step 5: コミット**

```bash
cd frontend
git add app/components/LandingPage.tsx __tests__/components/LandingPage.test.tsx
git commit -m "refactor: LandingPageを6コンポーネントの組み立てに縮小"
```

---

### Task 8: 全体検証

**Files:** なし（検証のみ）

- [ ] **Step 1: 対象ユニットテストを一括実行する**

Run:
```bash
cd frontend && yarn jest __tests__/components/landing/LandingHero.test.tsx __tests__/components/landing/LandingFeatureGrid.test.tsx __tests__/components/landing/LandingFaq.test.tsx __tests__/components/LandingPage.test.tsx
```
Expected: 全てPASS

- [ ] **Step 2: Jest全体を実行する**

Run: `cd frontend && yarn jest`
Expected: 全suite PASS（新規追加分を含め、既存分に regressions がないこと）

- [ ] **Step 3: `tsc --noEmit`を実行する**

Run: `cd frontend && yarn tsc --noEmit`
Expected: 今回変更したファイル（`LandingPage.tsx`／`landing/*.tsx`）に起因するエラーがないこと。`__tests__/**`配下の既存の広域型エラー（`jest.MockedFunction`等、tsconfigの`types`に`jest`が含まれないことに起因）は本変更と無関係のbaselineノイズなので無視してよい

- [ ] **Step 4: 既存E2Eを単一ワーカーで再実行する**

Run: `cd frontend && npx playwright test e2e/smoke.spec.ts e2e/trial-flow.spec.ts --workers=1`
Expected: 全てPASS（LPの文言・構造に依存しないことを設計時に確認済みだが、実装後に無回帰を再確認する）

- [ ] **Step 5: production buildを実行する**

Run: `cd frontend && yarn build`
Expected: 成功、`/`が静的生成のリストに出ること

- [ ] **Step 6: `git diff --check`を実行する**

Run: `git diff --check`
Expected: 出力なし（末尾空白等の混入なし）

- [ ] **Step 7: ブラウザで実機確認する**

Browser preview（`mcp__Claude_Browser__*`）で`/`を以下の3幅で確認する:
- 375px: モバイル1カラム。Heroは夜空固定背景で画像→見出し→本文→CTAの縦積み。他セクションは現行相当の見た目
- 768px: lg未満なのでモバイルと概ね同じレイアウト（機能グリッドは`sm:grid-cols-2`で2列になる）
- 1440px: Heroが左コピー＋右モルペウスの2カラム、Product Proofが3ステップ横並び、機能グリッドが3列、FAQが2列になること

ダークモードで、Heroが変わらず夜空固定であること・他セクションがテーマ追従で切り替わることを目視確認する。

- [ ] **Step 8: 最終コミット（検証のみで差分がなければスキップ）**

差分が発生していなければコミット不要。もし検証中に軽微な修正を加えた場合はそのファイルのみをコミットする。
