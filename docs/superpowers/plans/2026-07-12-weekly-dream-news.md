# 今週のゆめニュース（WeeklyDreamNewsWidget）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ホーム画面のサイドバーに、直近7日間の夢をプロフィールごとに要約する「今週のゆめニュース」ウィジェットを追加する。

**Architecture:** 新規のプレゼンテーショナルコンポーネント1つ（`WeeklyDreamNewsWidget.tsx`）を`home/page.tsx`が既に保持している`dreams`/`profiles` stateに接続するだけ。新規API呼び出し・バックエンド変更・migrationは無し。既存の`DreamStatsWidget`（7日ウィンドウ）・`ForestPreviewWidget`（アーカイブ除外）・`resolveDreamEmotionNames`/`pickTopEmotionLabels`/`formatTopEmotionLabels`（感情集計）のロジックをそのまま再利用する。

**Tech Stack:** Next.js 16 (App Router) / React / TypeScript / Tailwind v4（デザイントークン: `bg-card` `border-border` `text-card-foreground` `text-muted-foreground`）/ Jest + `@testing-library/react`。

## Global Constraints

- コンポーネント名は `WeeklyDreamNewsWidget`（家族に限らないプロフィール構成でも使える汎用名）
- ユーザー向けタイトルは常に「今週のゆめニュース」固定（プロフィール数に関わらず変えない）
- 補助文はアクティブプロフィール数で出し分け: 1件「今週はこんな夢を見たよ」／2件以上「みんなの今週の夢を見てみよう」
- 直近7日の判定は `DreamStatsWidget.tsx` と**完全に同じ比較演算子**を使う: `new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)` 以降を対象（`now = new Date()`）
- 最新夢タイトルの表示は `latestDream.title?.trim() || "タイトルのない夢"`
- 感情タグ抽出は `resolveDreamEmotionNames`・トップ感情抽出は `pickTopEmotionLabels`/`formatTopEmotionLabels`（新しいロジックを作らない）
- アーカイブ済みプロフィール（`profile.archived === true`）は集計・表示から除外する
- バックエンド・DB migration・認証・Stripe・OpenAI APIには一切触れない
- 出典spec: `docs/superpowers/specs/2026-07-12-weekly-dream-news-design.md`

---

## File Structure

- Create: `frontend/app/components/WeeklyDreamNewsWidget.tsx` — 新規コンポーネント本体（集計ロジック含む）
- Create: `frontend/__tests__/components/WeeklyDreamNewsWidget.test.tsx` — コンポーネントテスト9観点
- Modify: `frontend/app/home/page.tsx` — import追加＋`<aside>`内へ配置

---

### Task 1: WeeklyDreamNewsWidget コンポーネント本体とテスト

**Files:**
- Create: `frontend/app/components/WeeklyDreamNewsWidget.tsx`
- Test: `frontend/__tests__/components/WeeklyDreamNewsWidget.test.tsx`

**Interfaces:**
- Consumes: `Dream`・`DreamProfile`型（`@/app/types`）、`getChildFriendlyEmotionLabel`（`./EmotionTag`）、`resolveDreamEmotionNames`（`@/lib/dreamEmotions`）、`pickTopEmotionLabels`・`formatTopEmotionLabels`（`@/lib/emotionTie`）
- Produces: `export default function WeeklyDreamNewsWidget({ dreams, profiles }: { dreams: Dream[]; profiles: DreamProfile[] })`（`@/app/components/WeeklyDreamNewsWidget`からimport可能。Task 2がこのシグネチャで消費する）

- [ ] **Step 1: 失敗するテストを書く**

`frontend/__tests__/components/WeeklyDreamNewsWidget.test.tsx` を新規作成:

```tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import WeeklyDreamNewsWidget from "@/app/components/WeeklyDreamNewsWidget";
import type { Dream, DreamProfile } from "@/app/types";

// 「直近7日」判定が実行日に依存しないよう、現在時刻を固定する
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-07-12T00:00:00+09:00"));
});

afterEach(() => {
  jest.useRealTimers();
});

function makeProfile(overrides: Partial<DreamProfile> = {}): DreamProfile {
  return {
    id: 1,
    name: "ねこさん",
    avatar_emoji: "🐱",
    color: "#f97316",
    relationship: "self",
    active: true,
    position: 0,
    archived: false,
    created_at: "2026-01-01T00:00:00+09:00",
    updated_at: "2026-01-01T00:00:00+09:00",
    ...overrides,
  };
}

function makeDream(overrides: Partial<Dream> = {}): Dream {
  return {
    id: 1,
    title: "空を飛んで学校へ行った夢",
    content: "空を飛んでいました",
    userId: 1,
    dream_profile_id: 1,
    created_at: "2026-07-11T09:00:00+09:00",
    updated_at: "2026-07-11T09:00:00+09:00",
    emotions: [],
    ...overrides,
  };
}

describe("WeeklyDreamNewsWidget", () => {
  it("タイトルは常に「今週のゆめニュース」で固定される", () => {
    const profile = makeProfile();
    const dream = makeDream();
    render(<WeeklyDreamNewsWidget dreams={[dream]} profiles={[profile]} />);

    expect(screen.getByText("今週のゆめニュース")).toBeInTheDocument();
  });

  it("アクティブプロフィールが1件のとき「今週はこんな夢を見たよ」を表示する", () => {
    const profile = makeProfile();
    const dream = makeDream();
    render(<WeeklyDreamNewsWidget dreams={[dream]} profiles={[profile]} />);

    expect(screen.getByText("今週はこんな夢を見たよ")).toBeInTheDocument();
  });

  it("アクティブプロフィールが2件以上のとき「みんなの今週の夢を見てみよう」を表示する", () => {
    const profileA = makeProfile({ id: 1, name: "ねこさん" });
    const profileB = makeProfile({ id: 2, name: "モカ" });
    const dreamA = makeDream({ id: 1, dream_profile_id: 1 });
    const dreamB = makeDream({ id: 2, dream_profile_id: 2, title: "大きなお魚を追いかけた夢" });

    render(
      <WeeklyDreamNewsWidget dreams={[dreamA, dreamB]} profiles={[profileA, profileB]} />
    );

    expect(screen.getByText("みんなの今週の夢を見てみよう")).toBeInTheDocument();
  });

  it("直近7日より前の夢は集計対象外になる", () => {
    const profile = makeProfile();
    const oldDream = makeDream({
      id: 1,
      title: "8日前の夢",
      created_at: "2026-07-03T09:00:00+09:00", // 2026-07-12基準で8日前
    });
    render(<WeeklyDreamNewsWidget dreams={[oldDream]} profiles={[profile]} />);

    expect(screen.queryByText("「8日前の夢」")).not.toBeInTheDocument();
    expect(screen.getByText("今週はまだ夢の記録がないよ。")).toBeInTheDocument();
  });

  it("プロフィールごとに最新1件が正しく選ばれる（複数件あれば一番新しいものが出る）", () => {
    const profile = makeProfile();
    const olderDream = makeDream({
      id: 1,
      title: "古い方の夢",
      created_at: "2026-07-10T09:00:00+09:00",
    });
    const newerDream = makeDream({
      id: 2,
      title: "新しい方の夢",
      created_at: "2026-07-11T09:00:00+09:00",
    });
    render(
      <WeeklyDreamNewsWidget dreams={[olderDream, newerDream]} profiles={[profile]} />
    );

    expect(screen.getByText("「新しい方の夢」")).toBeInTheDocument();
    expect(screen.queryByText("「古い方の夢」")).not.toBeInTheDocument();
  });

  it("最新夢のtitleが空文字/未設定の場合「タイトルのない夢」を表示する", () => {
    const profile = makeProfile();
    const dream = makeDream({ title: "" });
    render(<WeeklyDreamNewsWidget dreams={[dream]} profiles={[profile]} />);

    expect(screen.getByText("「タイトルのない夢」")).toBeInTheDocument();
  });

  it("感情タグを集計してトップ感情を表示する（resolveDreamEmotionNames経由）", () => {
    const profile = makeProfile();
    const dream = makeDream({
      emotions: [],
      analysis_json: { analysis: "", emotion_tags: ["たのしい"] },
    });
    render(<WeeklyDreamNewsWidget dreams={[dream]} profiles={[profile]} />);

    expect(screen.getByText(/いちばん多かった きもち/)).toBeInTheDocument();
    expect(screen.getByText(/たのしい/)).toBeInTheDocument();
  });

  it("同率トップの感情タグは複数表示される（pickTopEmotionLabels経由）", () => {
    const profile = makeProfile();
    const dreamA = makeDream({
      id: 1,
      emotions: [],
      analysis_json: { analysis: "", emotion_tags: ["たのしい"] },
    });
    const dreamB = makeDream({
      id: 2,
      emotions: [],
      analysis_json: { analysis: "", emotion_tags: ["わくわく"] },
    });
    render(
      <WeeklyDreamNewsWidget dreams={[dreamA, dreamB]} profiles={[profile]} />
    );

    expect(screen.getByText(/「たのしい」と「わくわく」/)).toBeInTheDocument();
  });

  it("アクティブプロフィールは存在するが直近7日の夢が全件0件のとき、単一の空状態メッセージのみ表示する", () => {
    const profile = makeProfile();
    render(<WeeklyDreamNewsWidget dreams={[]} profiles={[profile]} />);

    expect(screen.getByText("今週のゆめニュース")).toBeInTheDocument();
    expect(screen.getByText("今週はまだ夢の記録がないよ。")).toBeInTheDocument();
    expect(screen.queryByText(profile.name, { exact: false })).not.toBeInTheDocument();
  });

  it("一部プロフィールのみ0件のとき、記録があるプロフィールのカードと個別空状態の一文を両方表示する", () => {
    const profileWithDream = makeProfile({ id: 1, name: "ねこさん" });
    const profileWithoutDream = makeProfile({ id: 2, name: "モカ" });
    const dream = makeDream({ dream_profile_id: 1 });

    render(
      <WeeklyDreamNewsWidget
        dreams={[dream]}
        profiles={[profileWithDream, profileWithoutDream]}
      />
    );

    expect(screen.getByText(/ねこさん/)).toBeInTheDocument();
    expect(
      screen.getByText("今週まだ記録がないプロフィールにも、また夢を見たら教えてね。")
    ).toBeInTheDocument();
  });

  it("アーカイブ済みプロフィールは集計・表示から除外される", () => {
    const archivedProfile = makeProfile({ id: 1, name: "アーカイブ済み", archived: true });
    const dream = makeDream({ dream_profile_id: 1 });

    render(<WeeklyDreamNewsWidget dreams={[dream]} profiles={[archivedProfile]} />);

    // アクティブプロフィールが0件になるため、コンポーネント自体が非表示
    expect(screen.queryByText("今週のゆめニュース")).not.toBeInTheDocument();
  });

  it("アクティブプロフィールが0件のとき何も描画しない", () => {
    const { container } = render(
      <WeeklyDreamNewsWidget dreams={[]} profiles={[]} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: テストを実行し、失敗を確認する**

Run: `cd frontend && npx jest __tests__/components/WeeklyDreamNewsWidget.test.tsx`
Expected: FAIL（`Cannot find module '@/app/components/WeeklyDreamNewsWidget'`）

- [ ] **Step 3: コンポーネントを実装する**

`frontend/app/components/WeeklyDreamNewsWidget.tsx` を新規作成:

```tsx
"use client";

import { Dream, DreamProfile } from "@/app/types";
import { getChildFriendlyEmotionLabel } from "./EmotionTag";
import { resolveDreamEmotionNames } from "@/lib/dreamEmotions";
import { pickTopEmotionLabels, formatTopEmotionLabels } from "@/lib/emotionTie";

interface WeeklyDreamNewsWidgetProps {
  dreams: Dream[];
  profiles: DreamProfile[];
}

interface ProfileWeeklySummary {
  profile: DreamProfile;
  count: number;
  latestTitle: string | null;
  topEmotionLabel: string;
}

/**
 * 直近7日間の夢をプロフィールごとに要約する「今週のゆめニュース」ウィジェット。
 * ホームページのサイドバーに配置。新規API呼び出しは行わず、
 * home/page.tsxが既に取得済みのdreams/profilesをそのまま集計する。
 */
export default function WeeklyDreamNewsWidget({
  dreams,
  profiles,
}: WeeklyDreamNewsWidgetProps) {
  const activeProfiles = profiles.filter((p) => !p.archived);
  if (activeProfiles.length === 0) return null;

  // 直近7日の判定はDreamStatsWidget.tsxと完全に同じ比較演算子を使う
  // （統計とニュースで判定がずれる事故を防ぐため、新しく計算し直さない）
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekDreams = dreams.filter((d) => new Date(d.created_at) >= weekAgo);

  const summaries: ProfileWeeklySummary[] = activeProfiles.map((profile) => {
    const profileDreams = weekDreams
      .filter((d) => d.dream_profile_id === profile.id)
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

    const latestDream = profileDreams[0] ?? null;
    const latestTitle = latestDream
      ? latestDream.title?.trim() || "タイトルのない夢"
      : null;

    const emotionCounts: Record<string, number> = {};
    profileDreams.forEach((dream) => {
      resolveDreamEmotionNames(dream).forEach((tag) => {
        const label = getChildFriendlyEmotionLabel(tag);
        emotionCounts[label] = (emotionCounts[label] ?? 0) + 1;
      });
    });

    return {
      profile,
      count: profileDreams.length,
      latestTitle,
      topEmotionLabel: formatTopEmotionLabels(pickTopEmotionLabels(emotionCounts)),
    };
  });

  const withDreams = summaries.filter((s) => s.count > 0);
  const withoutDreams = summaries.filter((s) => s.count === 0);

  const subtitle =
    activeProfiles.length === 1
      ? "今週はこんな夢を見たよ"
      : "みんなの今週の夢を見てみよう";

  if (withDreams.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 w-full mb-4">
        <h3 className="font-bold text-card-foreground mb-1 flex items-center gap-2">
          <span aria-hidden="true">📰</span>
          <span>今週のゆめニュース</span>
        </h3>
        <p className="text-xs text-muted-foreground">今週はまだ夢の記録がないよ。</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 w-full mb-4">
      <h3 className="font-bold text-card-foreground mb-1 flex items-center gap-2">
        <span aria-hidden="true">📰</span>
        <span>今週のゆめニュース</span>
      </h3>
      <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>

      <div className="space-y-3">
        {withDreams.map(({ profile, count, latestTitle, topEmotionLabel }) => (
          <div key={profile.id} className="flex items-start gap-2">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
              style={{ backgroundColor: `${profile.color}33` }}
              aria-hidden="true"
            >
              {profile.avatar_emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-card-foreground truncate">
                {profile.name}：{count}つの夢を記録
              </p>
              {latestTitle && (
                <p className="text-xs text-muted-foreground truncate">「{latestTitle}」</p>
              )}
              {topEmotionLabel && (
                <p className="text-xs text-muted-foreground">
                  いちばん多かった きもち：{topEmotionLabel}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {withoutDreams.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          今週まだ記録がないプロフィールにも、また夢を見たら教えてね。
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: テストを実行し、全件成功を確認する**

Run: `cd frontend && npx jest __tests__/components/WeeklyDreamNewsWidget.test.tsx`
Expected: PASS（12 examples, 0 failures）

- [ ] **Step 5: コミット**

```bash
cd frontend
git add app/components/WeeklyDreamNewsWidget.tsx __tests__/components/WeeklyDreamNewsWidget.test.tsx
git commit -m "feat: WeeklyDreamNewsWidgetを追加（今週のゆめニュース）"
```

---

### Task 2: home/page.tsx への組み込み

**Files:**
- Modify: `frontend/app/home/page.tsx`

**Interfaces:**
- Consumes: Task 1が produce した `WeeklyDreamNewsWidget`（`{ dreams: Dream[]; profiles: DreamProfile[] }` props）
- Produces: なし（末端の組み込み）

- [ ] **Step 1: importを追加する**

`frontend/app/home/page.tsx` の既存import群（21行目 `ForestPreviewWidget` の直後）に追加:

```tsx
import ForestPreviewWidget from "@/app/components/forest/ForestPreviewWidget";
import WeeklyDreamNewsWidget from "@/app/components/WeeklyDreamNewsWidget";
```

- [ ] **Step 2: `<aside>`内、ForestPreviewWidgetの直後に配置する**

既存のこの箇所（`<aside>`内、396行目付近）:

```tsx
        {/* もりプレビュー */}
        {!loading && profiles.length > 0 && <ForestPreviewWidget profiles={profiles} />}

        {/* 連続記録バッジ */}
        <DreamStreakBadge dreams={dreams} />
```

を次のように変更する:

```tsx
        {/* もりプレビュー */}
        {!loading && profiles.length > 0 && <ForestPreviewWidget profiles={profiles} />}

        {/* 今週のゆめニュース */}
        {!loading && profiles.length > 0 && (
          <WeeklyDreamNewsWidget dreams={dreams} profiles={profiles} />
        )}

        {/* 連続記録バッジ */}
        <DreamStreakBadge dreams={dreams} />
```

- [ ] **Step 3: フロントの型チェックとJest全体を実行する**

Run: `cd frontend && npx tsc --noEmit`
Expected: `WeeklyDreamNewsWidget`関連の新規型エラーが無いこと（既存の無関係なtscエラーは対象外）

Run: `cd frontend && npx jest`
Expected: 全suite緑（既存テストの回帰なし）

- [ ] **Step 4: ローカルDocker dev環境またはプレビューでスマホ幅表示を確認する**

`/home`にログイン状態でアクセスし、以下を目視確認する（spec §5の手動QA）:
- [ ] スマホ幅（375px程度）でカードが横にはみ出さない
- [ ] 長いプロフィール名・夢タイトルでも崩れない（`truncate`が効いている）
- [ ] 夢が多くてもウィジェットが縦に長くなりすぎない（プロフィールごとに最新1件のみ表示のため、アクティブプロフィール上限5件で自然に高さが収まる設計になっている）
- [ ] アーカイブ済みプロフィールが表示されない
- [ ] 1人利用でも「家族」という不自然な表現が出ない（タイトルは「今週のゆめニュース」固定のため文言上は問題ないはずだが、実機で確認する）

- [ ] **Step 5: コミット**

```bash
cd frontend
git add app/home/page.tsx
git commit -m "feat: ホーム画面にWeeklyDreamNewsWidgetを配置"
```

---

## Self-Review

**Spec coverage**: spec §0（調査結論・バックエンド不要）→ Global Constraints・Task 1に反映。§1（コンポーネント仕様・集計ロジック）→ Task 1 Step 3。§2（空状態3パターン）→ Task 1 Step 3 + テストケース。§3（配置）→ Task 2。§4（テスト方針・9観点・時刻固定）→ Task 1 Step 1。§5（完成条件・手動QA）→ Task 2 Step 3-4。§6（境界）→ Global Constraints。すべて対応するタスクあり。

**Placeholder scan**: 「TBD」「後で実装」等の記述なし。全ステップに実コードを記載済み。

**Type consistency**: `WeeklyDreamNewsWidgetProps`・`ProfileWeeklySummary`の型名・フィールド名はTask 1内のテストと実装で一致。Task 2のimport文はTask 1の`export default function WeeklyDreamNewsWidget`と一致。
