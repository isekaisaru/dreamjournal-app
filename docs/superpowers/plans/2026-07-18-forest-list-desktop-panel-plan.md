# 夢の森一覧（/forest）デスクトップ化 — 常駐右サイドパネル Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/forest`一覧ページのlg+（1024px以上）幅を「森キャンバス（左）＋常駐プレビューパネル（右）」の2カラムに変更する。モバイル（lg未満）の挙動は完全に維持する。

**Architecture:** `ForestScene`の内部ロジック（ドラッグ/ピンチ/パン判定）には一切触れず、「選択中プロフィール」の状態だけを`ForestScene`から`/forest/page.tsx`に引き上げる（制御コンポーネント化）。プレビューの中身（プロフィール見出し・直近の夢・CTA）は`TreePreviewContent`として抽出し、モバイルの`TreePreviewSheet`（下シート）とデスクトップの新規`TreeSidePanel`（常駐右パネル）の両方から共有する。直近の夢データは`useRecentDream`フックでページから一度だけ取得し、両方の器に配る（二重fetch防止）。

**Tech Stack:** Next.js App Router / React / TypeScript / Tailwind CSS / Jest + React Testing Library / Playwright

参照仕様書: `docs/superpowers/specs/2026-07-18-forest-list-desktop-panel-design.md`

## Global Constraints

- lgブレークポイントはTailwindのデフォルト（1024px以上）を使う。それ以外のカスタムブレークポイントは導入しない
- `ForestScene`のポインタ捕捉・ドラッグ/ピンチ判定・パン・ズームクランプのロジックは一切変更しない（コード内に「重要」と明記された繊細な実装のため）
- lg未満（モバイル・タブレット）の見た目・挙動は現状から一切変えない
- ブレークポイントの出し分けは、このセッションで確立済みの「`hidden`/`lg:hidden`クラスで非表示にするだけでDOMはアンマウントしない」パターンに統一する（条件付きアンマウントは使わない）
- `TreeSidePanel`の未選択時の中身は既存の`ForestTodayCard`をそのまま流用する（新規デザインを起こさない）。`ForestTodayCard.tsx`自体は変更しない
- ホバーツールチップ・矢印キーによる木の選択は今回のスコープ外（実装しない）
- `/forest/[profileId]`詳細ページ、月スクラバー、ズーム画像シェア、ヘッダー統計チップは今回のスコープ外

---

## ファイル構成

**新規作成:**
- `frontend/hooks/useRecentDream.ts` — 直近の夢を1件取得するフック
- `frontend/__tests__/hooks/useRecentDream.test.tsx`
- `frontend/app/components/forest/TreePreviewContent.tsx` — プレビュー中身の純粋表示コンポーネント
- `frontend/__tests__/components/TreePreviewContent.test.tsx`
- `frontend/app/components/forest/TreeSidePanel.tsx` — lg+常駐右パネル
- `frontend/__tests__/components/TreeSidePanel.test.tsx`
- `frontend/__tests__/app/forest/page.test.tsx` — `/forest`ページの状態配線テスト（新規）

**変更:**
- `frontend/app/components/forest/TreePreviewSheet.tsx` — 中身を`TreePreviewContent`に委譲、`lg:hidden`追加
- `frontend/__tests__/components/TreePreviewSheet.test.tsx` — 新I/Fに合わせて書き換え
- `frontend/app/components/forest/ForestScene.tsx` — 選択状態を制御コンポーネント化
- `frontend/app/forest/page.tsx` — 2カラムレイアウト・状態の保有
- `frontend/e2e/forest-flow.spec.ts` — モバイル/デスクトップのdescribeに分割し、デスクトップケースを追加

---

### Task 1: `useRecentDream`フックの抽出

**Files:**
- Create: `frontend/hooks/useRecentDream.ts`
- Test: `frontend/__tests__/hooks/useRecentDream.test.tsx`

**Interfaces:**
- Consumes: `getDreamsForProfile(profileId: number): Promise<Dream[]>`（`frontend/lib/apiClient.ts`に既存）
- Produces: `useRecentDream(profileId: number | null): { recentDream: Dream | null; loading: boolean }` — Task 3, 6 で使用

現在`frontend/app/components/forest/TreePreviewSheet.tsx`が自前で行っている直近の夢取得ロジック（`normalizeRecentDreamsResponse`・`cancelled`ガード・loading管理）をフックとして抽出する。モバイルの下シートとデスクトップの右パネルの両方が同じデータを使うため、取得箇所をページに一本化する土台になる。

- [ ] **Step 1: 失敗するテストを書く**

`frontend/__tests__/hooks/useRecentDream.test.tsx`:

```tsx
import { renderHook, waitFor } from "@testing-library/react";
import { useRecentDream } from "@/hooks/useRecentDream";
import type { Dream } from "@/app/types";
import { getDreamsForProfile } from "@/lib/apiClient";

jest.mock("@/lib/apiClient", () => ({
  getDreamsForProfile: jest.fn(),
}));

const mockedGetDreamsForProfile = getDreamsForProfile as jest.MockedFunction<
  typeof getDreamsForProfile
>;

function dream(overrides: Partial<Dream> = {}): Dream {
  return {
    id: 1,
    title: "古い木のゆめ",
    userId: 1,
    created_at: "2026-06-14T00:00:00Z",
    updated_at: "2026-06-14T00:00:00Z",
    emotions: [{ id: 1, name: "喜び" }],
    ...overrides,
  };
}

describe("useRecentDream", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  it("正常な応答から最初の夢を返す", async () => {
    mockedGetDreamsForProfile.mockResolvedValueOnce([dream({ title: "空飛ぶ夢" })]);

    const { result } = renderHook(({ id }) => useRecentDream(id), {
      initialProps: { id: 1 as number | null },
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.recentDream?.title).toBe("空飛ぶ夢");
  });

  it("profileIdがnullのときは何も取得しない", () => {
    const { result } = renderHook(() => useRecentDream(null));

    expect(result.current.recentDream).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(mockedGetDreamsForProfile).not.toHaveBeenCalled();
  });

  it("プロフィール切替後に失敗しても、前のプロフィールの直近の夢は残さない", async () => {
    mockedGetDreamsForProfile
      .mockResolvedValueOnce([dream({ title: "前の木のゆめ" })])
      .mockRejectedValueOnce(new Error("temporary failure"));

    const { result, rerender } = renderHook(({ id }) => useRecentDream(id), {
      initialProps: { id: 1 as number | null },
    });

    await waitFor(() => expect(result.current.recentDream?.title).toBe("前の木のゆめ"));

    rerender({ id: 2 });

    await waitFor(() => expect(mockedGetDreamsForProfile).toHaveBeenCalledWith(2));
    await waitFor(() => expect(result.current.recentDream).toBeNull());
  });

  it("配列でない応答は無視してクラッシュしない", async () => {
    mockedGetDreamsForProfile.mockResolvedValueOnce({ error: "bad response" } as any);

    const { result } = renderHook(({ id }) => useRecentDream(id), {
      initialProps: { id: 1 as number | null },
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.recentDream).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Unexpected dreams response for tree preview sheet",
      { error: "bad response" }
    );
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `cd frontend && yarn jest __tests__/hooks/useRecentDream.test.tsx`
Expected: FAIL（`Cannot find module '@/hooks/useRecentDream'`）

- [ ] **Step 3: フックを実装する**

`frontend/hooks/useRecentDream.ts`:

```ts
import { useEffect, useState } from "react";
import type { Dream } from "@/app/types";
import { getDreamsForProfile } from "@/lib/apiClient";

function normalizeRecentDreamsResponse(value: unknown): Dream[] {
  if (Array.isArray(value)) return value as Dream[];

  console.error("Unexpected dreams response for tree preview sheet", value);
  return [];
}

/**
 * 選択中プロフィールの直近の夢を1件取得する。
 * プロフィールが切り替わったら、古い応答が新しい選択を上書きしないよう破棄する。
 */
export function useRecentDream(profileId: number | null): {
  recentDream: Dream | null;
  loading: boolean;
} {
  const [recentDream, setRecentDream] = useState<Dream | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profileId === null) {
      setRecentDream(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setRecentDream(null);
    getDreamsForProfile(profileId)
      .then((dreams) => {
        if (!cancelled) setRecentDream(normalizeRecentDreamsResponse(dreams)[0] ?? null);
      })
      .catch(() => {
        /* silently ignore — panel/sheet is still useful without a recent dream */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  return { recentDream, loading };
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `cd frontend && yarn jest __tests__/hooks/useRecentDream.test.tsx`
Expected: PASS（4 tests）

- [ ] **Step 5: コミット**

```bash
cd frontend
git add hooks/useRecentDream.ts __tests__/hooks/useRecentDream.test.tsx
git commit -m "feat: 直近の夢取得をuseRecentDreamフックに抽出"
```

---

### Task 2: `TreePreviewContent`（プレビュー中身の共有コンポーネント）

**Files:**
- Create: `frontend/app/components/forest/TreePreviewContent.tsx`
- Test: `frontend/__tests__/components/TreePreviewContent.test.tsx`

**Interfaces:**
- Consumes: `DreamProfile`, `Dream`型（`@/app/types`）、`getGrowthLevel`・`EMOTION_COLORS`（`@/lib/forest`）
- Produces: `TreePreviewContent({ profile, recentDream, loading, onOpen }: { profile: DreamProfile; recentDream: Dream | null; loading: boolean; onOpen: (profile: DreamProfile) => void }): JSX.Element` — Task 3, 4 で使用

- [ ] **Step 1: 失敗するテストを書く**

`frontend/__tests__/components/TreePreviewContent.test.tsx`:

```tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import TreePreviewContent from "@/app/components/forest/TreePreviewContent";
import type { Dream, DreamProfile } from "@/app/types";

function profile(overrides: Partial<DreamProfile> = {}): DreamProfile {
  return {
    id: 1,
    name: "自分",
    avatar_emoji: "🧑",
    color: "#8b5cf6",
    relationship: "self",
    active: true,
    position: 1,
    archived: false,
    created_at: "2026-06-14T00:00:00Z",
    updated_at: "2026-06-14T00:00:00Z",
    dreams_count: 1,
    ...overrides,
  };
}

function dream(overrides: Partial<Dream> = {}): Dream {
  return {
    id: 1,
    title: "古い木のゆめ",
    userId: 1,
    created_at: "2026-06-14T00:00:00Z",
    updated_at: "2026-06-14T00:00:00Z",
    emotions: [{ id: 1, name: "喜び" }],
    ...overrides,
  };
}

describe("TreePreviewContent", () => {
  it("プロフィール見出しを表示する", () => {
    render(
      <TreePreviewContent
        profile={profile({ name: "モカ", dreams_count: 3 })}
        recentDream={null}
        loading={false}
        onOpen={jest.fn()}
      />
    );

    expect(screen.getByText("モカの き")).toBeInTheDocument();
    expect(screen.getByText(/ゆめ 3こ/)).toBeInTheDocument();
  });

  it("直近の夢とその感情タグを表示する", () => {
    render(
      <TreePreviewContent
        profile={profile()}
        recentDream={dream({ title: "空飛ぶ夢" })}
        loading={false}
        onOpen={jest.fn()}
      />
    );

    expect(screen.getByText(/空飛ぶ夢/)).toBeInTheDocument();
    expect(screen.getByText("喜び")).toBeInTheDocument();
  });

  it("読み込み中は「よみこんでいるよ…」を表示し、直近の夢は表示しない", () => {
    render(
      <TreePreviewContent
        profile={profile()}
        recentDream={null}
        loading={true}
        onOpen={jest.fn()}
      />
    );

    expect(screen.getByText("よみこんでいるよ…")).toBeInTheDocument();
    expect(screen.queryByText("さいきんの ゆめ：")).not.toBeInTheDocument();
  });

  it("感情が配列でない場合は空扱いにする", () => {
    render(
      <TreePreviewContent
        profile={profile()}
        recentDream={dream({ title: "ふしぎな森", emotions: "bad" as any })}
        loading={false}
        onOpen={jest.fn()}
      />
    );

    expect(screen.getByText(/ふしぎな森/)).toBeInTheDocument();
    expect(screen.queryByText("喜び")).not.toBeInTheDocument();
  });

  it("タイトルが文字列でない場合は直近の夢欄を表示しない", () => {
    render(
      <TreePreviewContent
        profile={profile()}
        recentDream={dream({ title: null as any })}
        loading={false}
        onOpen={jest.fn()}
      />
    );

    expect(screen.queryByText("さいきんの ゆめ：")).not.toBeInTheDocument();
  });

  it("CTAクリックでonOpenにprofileを渡して呼び出す", () => {
    const onOpen = jest.fn();
    const p = profile({ id: 7 });
    render(<TreePreviewContent profile={p} recentDream={null} loading={false} onOpen={onOpen} />);

    fireEvent.click(screen.getByRole("button", { name: /この きを 見る/ }));

    expect(onOpen).toHaveBeenCalledWith(p);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `cd frontend && yarn jest __tests__/components/TreePreviewContent.test.tsx`
Expected: FAIL（`Cannot find module '@/app/components/forest/TreePreviewContent'`）

- [ ] **Step 3: コンポーネントを実装する**

`frontend/app/components/forest/TreePreviewContent.tsx`:

```tsx
"use client";

import type { DreamProfile, Dream } from "@/app/types";
import { getGrowthLevel, EMOTION_COLORS } from "@/lib/forest";

interface TreePreviewContentProps {
  profile: DreamProfile;
  recentDream: Dream | null;
  loading: boolean;
  onOpen: (profile: DreamProfile) => void;
}

function dreamTitle(dream: Dream): string | null {
  return typeof dream.title === "string" ? dream.title : null;
}

function dreamEmotions(dream: Dream): NonNullable<Dream["emotions"]> {
  return Array.isArray(dream.emotions) ? dream.emotions : [];
}

/**
 * 木のプレビュー中身（プロフィール見出し・直近の夢・CTA）。
 * データ取得は行わない純粋な表示コンポーネント。
 * モバイルの TreePreviewSheet（下シート）とデスクトップの TreeSidePanel（右パネル）から共有される。
 */
export default function TreePreviewContent({
  profile,
  recentDream,
  loading,
  onOpen,
}: TreePreviewContentProps) {
  const lvl = getGrowthLevel(profile.dreams_count ?? 0);
  const recentDreamTitle = recentDream ? dreamTitle(recentDream) : null;
  const recentDreamEmotions = recentDream ? dreamEmotions(recentDream) : [];

  return (
    <div>
      {/* header */}
      <div className="mb-2.5 flex items-center gap-2.5">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full text-2xl"
          style={{ background: `${profile.color}26`, border: `1.5px solid ${profile.color}88` }}
        >
          {profile.avatar_emoji}
        </div>
        <div>
          <p className="text-[17px] font-black">{profile.name}の き</p>
          <p className="text-[12.5px] font-bold" style={{ color: profile.color }}>
            {lvl.name}（{lvl.reading}）・ ゆめ {profile.dreams_count ?? 0}こ
          </p>
        </div>
      </div>

      {/* recent dream */}
      {!loading && recentDream && recentDreamTitle && (
        <div className="mb-3 text-[13px] leading-relaxed text-white/80">
          <span className="text-white/50">さいきんの ゆめ：</span>
          「{recentDreamTitle}」
          {recentDreamEmotions.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {recentDreamEmotions.map((e) => (
                <span
                  key={e.id}
                  className="rounded-full px-2 py-0.5 text-[11.5px] font-bold"
                  style={{
                    background: `${EMOTION_COLORS[e.name] ?? profile.color}22`,
                    color: EMOTION_COLORS[e.name] ?? profile.color,
                  }}
                >
                  {e.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {loading && <p className="mb-3 text-[12px] text-white/40">よみこんでいるよ…</p>}

      {/* CTA */}
      <button
        onClick={() => onOpen(profile)}
        style={{
          background: `linear-gradient(135deg, ${profile.color}, #7c3aed)`,
          boxShadow: `0 8px 22px ${profile.color}44`,
        }}
        className="w-full rounded-[13px] py-2.5 text-[14.5px] font-black text-white"
      >
        この きを 見る ›
      </button>
    </div>
  );
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `cd frontend && yarn jest __tests__/components/TreePreviewContent.test.tsx`
Expected: PASS（6 tests）

- [ ] **Step 5: コミット**

```bash
cd frontend
git add app/components/forest/TreePreviewContent.tsx __tests__/components/TreePreviewContent.test.tsx
git commit -m "feat: 木プレビューの中身をTreePreviewContentとして抽出"
```

---

### Task 3: `TreePreviewSheet`をpropsベースに書き換え、`lg:hidden`にする

**Files:**
- Modify: `frontend/app/components/forest/TreePreviewSheet.tsx`（全面書き換え）
- Modify: `frontend/__tests__/components/TreePreviewSheet.test.tsx`（全面書き換え）

**Interfaces:**
- Consumes: `TreePreviewContent`（Task 2で作成）
- Produces: `TreePreviewSheet({ profile, recentDream, loading, onOpen, onClose }: { profile: DreamProfile | null; recentDream: Dream | null; loading: boolean; onOpen: (profile: DreamProfile) => void; onClose: () => void }): JSX.Element` — Task 5（ForestScene）で使用

現在の`TreePreviewSheet`は自前で`getDreamsForProfile`を呼んでいるが、これをやめて`recentDream`・`loading`をpropsで受け取るようにする。取得ロジックのテスト（非配列応答・不正な感情・不正なタイトル・プロフィール切替時の破棄）はTask 1・Task 2に移設済みなので、このコンポーネントのテストは「propsを正しくTreePreviewContentへ渡し、lg:hiddenが付いていること」に絞る。

- [ ] **Step 1: 失敗するテストを書く（既存テストを置き換える）**

`frontend/__tests__/components/TreePreviewSheet.test.tsx`（既存ファイルを以下で置き換える）:

```tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import TreePreviewSheet from "@/app/components/forest/TreePreviewSheet";
import type { DreamProfile } from "@/app/types";

function profile(overrides: Partial<DreamProfile> = {}): DreamProfile {
  return {
    id: 1,
    name: "自分",
    avatar_emoji: "🧑",
    color: "#8b5cf6",
    relationship: "self",
    active: true,
    position: 1,
    archived: false,
    created_at: "2026-06-14T00:00:00Z",
    updated_at: "2026-06-14T00:00:00Z",
    dreams_count: 1,
    ...overrides,
  };
}

describe("TreePreviewSheet", () => {
  it("profileがnullのときは何も描画しない", () => {
    render(
      <TreePreviewSheet
        profile={null}
        recentDream={null}
        loading={false}
        onOpen={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: /この きを 見る/ })).not.toBeInTheDocument();
  });

  it("profileがあるときはlg:hiddenクラス付きで描画し、中身をTreePreviewContentへ委譲する", () => {
    render(
      <TreePreviewSheet
        profile={profile({ name: "モカ" })}
        recentDream={null}
        loading={false}
        onOpen={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText("モカの き")).toBeInTheDocument();
    expect(screen.getByTestId("tree-preview-sheet")).toHaveClass("lg:hidden");
  });

  it("閉じるボタンでonCloseが呼ばれる", () => {
    const onClose = jest.fn();
    render(
      <TreePreviewSheet
        profile={profile()}
        recentDream={null}
        loading={false}
        onOpen={jest.fn()}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "とじる" }));

    expect(onClose).toHaveBeenCalled();
  });

  it("CTAクリックでonOpenにprofileを渡す", () => {
    const onOpen = jest.fn();
    const p = profile({ id: 5 });
    render(
      <TreePreviewSheet
        profile={p}
        recentDream={null}
        loading={false}
        onOpen={onOpen}
        onClose={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /この きを 見る/ }));

    expect(onOpen).toHaveBeenCalledWith(p);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `cd frontend && yarn jest __tests__/components/TreePreviewSheet.test.tsx`
Expected: FAIL（`recentDream`/`loading`propsが存在せず型エラー、または`tree-preview-sheet` testidが見つからない）

- [ ] **Step 3: コンポーネントを書き換える**

`frontend/app/components/forest/TreePreviewSheet.tsx`（既存ファイルを以下で置き換える）:

```tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { DreamProfile, Dream } from "@/app/types";
import TreePreviewContent from "./TreePreviewContent";

interface TreePreviewSheetProps {
  profile: DreamProfile | null;
  recentDream: Dream | null;
  loading: boolean;
  onOpen: (profile: DreamProfile) => void;
  onClose: () => void;
}

/**
 * 木をタップしたときに下からスライドアップするプレビューシート（lg未満のみ表示）。
 * lg+ では TreeSidePanel が同じ役割を常駐パネルとして担うため、ここは lg:hidden で隠す
 * （DOM 自体は常にマウントし、hidden クラスで出し分ける）。
 * 中身（プロフィール見出し・直近の夢・CTA）は TreePreviewContent と共通。
 */
export default function TreePreviewSheet({
  profile,
  recentDream,
  loading,
  onOpen,
  onClose,
}: TreePreviewSheetProps) {
  return (
    <AnimatePresence>
      {profile && (
        <motion.div
          key={profile.id}
          data-testid="tree-preview-sheet"
          initial={{ y: 32, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 24, opacity: 0, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          style={{ borderColor: `${profile.color}55` }}
          className="absolute bottom-4 left-1/2 z-[45] w-[min(420px,calc(100%-120px))] -translate-x-1/2 rounded-[22px] border bg-gradient-to-br from-[rgba(28,26,60,0.96)] to-[rgba(16,14,40,0.96)] p-4 text-white shadow-[0_20px_50px_rgba(6,4,20,0.55)] lg:hidden"
        >
          {/* close */}
          <button
            onClick={onClose}
            aria-label="とじる"
            className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <TreePreviewContent profile={profile} recentDream={recentDream} loading={loading} onOpen={onOpen} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `cd frontend && yarn jest __tests__/components/TreePreviewSheet.test.tsx`
Expected: PASS（4 tests）

- [ ] **Step 5: コミット**

```bash
cd frontend
git add app/components/forest/TreePreviewSheet.tsx __tests__/components/TreePreviewSheet.test.tsx
git commit -m "refactor: TreePreviewSheetをprops駆動にしlg:hiddenを追加"
```

---

### Task 4: `TreeSidePanel`（lg+常駐右パネル）

**Files:**
- Create: `frontend/app/components/forest/TreeSidePanel.tsx`
- Test: `frontend/__tests__/components/TreeSidePanel.test.tsx`

**Interfaces:**
- Consumes: `TreePreviewContent`（Task 2）、`ForestTodayCard`（既存・無変更、`frontend/app/components/forest/ForestTodayCard.tsx`）
- Produces: `TreeSidePanel({ profiles, selectedProfile, recentDream, loading, totalDreams, topProfile, onOpen, onClose }: { profiles: DreamProfile[]; selectedProfile: DreamProfile | null; recentDream: Dream | null; loading: boolean; totalDreams: number; topProfile: DreamProfile | null; onOpen: (profile: DreamProfile) => void; onClose: () => void }): JSX.Element | null` — Task 6（`/forest/page.tsx`）で使用

- [ ] **Step 1: 失敗するテストを書く**

`frontend/__tests__/components/TreeSidePanel.test.tsx`:

```tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import TreeSidePanel from "@/app/components/forest/TreeSidePanel";
import type { DreamProfile } from "@/app/types";

function profile(overrides: Partial<DreamProfile> = {}): DreamProfile {
  return {
    id: 1,
    name: "自分",
    avatar_emoji: "🧑",
    color: "#8b5cf6",
    relationship: "self",
    active: true,
    position: 1,
    archived: false,
    created_at: "2026-06-14T00:00:00Z",
    updated_at: "2026-06-14T00:00:00Z",
    dreams_count: 1,
    ...overrides,
  };
}

describe("TreeSidePanel", () => {
  it("profilesが空のときは何も描画しない", () => {
    const { container } = render(
      <TreeSidePanel
        profiles={[]}
        selectedProfile={null}
        recentDream={null}
        loading={false}
        totalDreams={0}
        topProfile={null}
        onOpen={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("未選択時はきょうのもりカードとヒントを表示する", () => {
    render(
      <TreeSidePanel
        profiles={[profile()]}
        selectedProfile={null}
        recentDream={null}
        loading={false}
        totalDreams={5}
        topProfile={profile({ name: "モカ" })}
        onOpen={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText("きょうの もり")).toBeInTheDocument();
    expect(screen.getByText(/5この/)).toBeInTheDocument();
    expect(screen.getByText("きを えらんでね")).toBeInTheDocument();
  });

  it("選択時はTreePreviewContentを表示し、きょうのもりカードは表示しない", () => {
    render(
      <TreeSidePanel
        profiles={[profile()]}
        selectedProfile={profile({ name: "モカ" })}
        recentDream={null}
        loading={false}
        totalDreams={5}
        topProfile={null}
        onOpen={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText("モカの き")).toBeInTheDocument();
    expect(screen.queryByText("きょうの もり")).not.toBeInTheDocument();
  });

  it("常駐パネルにhidden lg:flexクラスを持つ", () => {
    render(
      <TreeSidePanel
        profiles={[profile()]}
        selectedProfile={null}
        recentDream={null}
        loading={false}
        totalDreams={0}
        topProfile={null}
        onOpen={jest.fn()}
        onClose={jest.fn()}
      />
    );

    const panel = screen.getByTestId("tree-side-panel");
    expect(panel).toHaveClass("hidden", "lg:flex");
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `cd frontend && yarn jest __tests__/components/TreeSidePanel.test.tsx`
Expected: FAIL（`Cannot find module '@/app/components/forest/TreeSidePanel'`）

- [ ] **Step 3: コンポーネントを実装する**

`frontend/app/components/forest/TreeSidePanel.tsx`:

```tsx
"use client";

import type { DreamProfile, Dream } from "@/app/types";
import ForestTodayCard from "./ForestTodayCard";
import TreePreviewContent from "./TreePreviewContent";

interface TreeSidePanelProps {
  profiles: DreamProfile[];
  selectedProfile: DreamProfile | null;
  recentDream: Dream | null;
  loading: boolean;
  totalDreams: number;
  topProfile: DreamProfile | null;
  onOpen: (profile: DreamProfile) => void;
  onClose: () => void;
}

/**
 * lg+ 専用の常駐右パネル。
 * 未選択時は「きょうの もり」（既存の ForestTodayCard を流用）を表示し、
 * 木を選ぶと TreePreviewContent に切り替わる。
 * lg未満では hidden クラスで非表示にするだけで、DOM 自体は常にマウントする
 * （MorpheusGuideLogin と同じ既存の出し分けパターンを踏襲）。
 * プロフィールが0件のときは何も描画しない。
 */
export default function TreeSidePanel({
  profiles,
  selectedProfile,
  recentDream,
  loading,
  totalDreams,
  topProfile,
  onOpen,
  onClose,
}: TreeSidePanelProps) {
  if (profiles.length === 0) return null;

  return (
    <div
      data-testid="tree-side-panel"
      className="hidden lg:flex lg:w-[360px] lg:flex-none lg:flex-col lg:rounded-3xl lg:border lg:border-white/10 lg:bg-[rgba(12,12,32,0.5)] lg:p-4 lg:text-white lg:backdrop-blur-lg"
    >
      {selectedProfile ? (
        <>
          <button
            onClick={onClose}
            className="mb-3 self-start text-[12.5px] font-bold text-white/60 hover:text-white"
          >
            ‹ えらびなおす
          </button>
          <TreePreviewContent
            profile={selectedProfile}
            recentDream={recentDream}
            loading={loading}
            onOpen={onOpen}
          />
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <ForestTodayCard totalDreams={totalDreams} topProfile={topProfile} />
          <p className="text-[13px] text-white/50">きを えらんでね</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `cd frontend && yarn jest __tests__/components/TreeSidePanel.test.tsx`
Expected: PASS（4 tests）

- [ ] **Step 5: コミット**

```bash
cd frontend
git add app/components/forest/TreeSidePanel.tsx __tests__/components/TreeSidePanel.test.tsx
git commit -m "feat: lg+常駐右パネルTreeSidePanelを追加"
```

---

### Task 5: `ForestScene`を選択状態の制御コンポーネントにする

**Files:**
- Modify: `frontend/app/components/forest/ForestScene.tsx`

**Interfaces:**
- Consumes: `TreePreviewSheet`の新I/F（Task 3で`recentDream`/`loading`propsが追加済み）
- Produces: `ForestScene`の新props `selectedProfileId: number | null`、`onSelectTree: (profile: DreamProfile) => void`、`onCloseSheet: () => void`、`recentDream: Dream | null`、`loading: boolean` — Task 6（`/forest/page.tsx`）から渡される

**このタスクにはユニットテストを追加しない。** 理由: `ForestScene`は`ParticleField`（Canvas）・`ResizeObserver`・複雑なポインタイベント処理に依存しており、このリポジトリには現時点でこれらをモックしてコンポーネント全体をレンダーするテストの前例がない（既存の`ForestScene.test.tsx`は`clampForestView`等の純粋関数のみを対象にしている）。今回変更するのは「選択状態の保持場所」のみで、ドラッグ/ピンチ/パンのロジック自体（＝既存の純粋関数テストが検証している部分）には触れない。安全性は以下で担保する:
- 既存の`__tests__/components/ForestScene.test.tsx`（純粋関数テスト）がそのまま通ること
- `tsc --noEmit`で新旧propsの型不整合がないこと
- Task 6の`/forest/page.tsx`テストで、`ForestScene`をモックした状態での配線（`onSelectTree`呼び出し→`selectedProfileId`反映）を検証すること
- Task 8のブラウザ確認で、モバイル幅のタップ選択・ドラッグが引き続き正しく動くことを目視確認すること

- [ ] **Step 1: import文に`Dream`型を追加する**

`frontend/app/components/forest/ForestScene.tsx`の7行目を変更:

変更前:
```tsx
import type { DreamProfile } from "@/app/types";
```

変更後:
```tsx
import type { DreamProfile, Dream } from "@/app/types";
```

- [ ] **Step 2: コンポーネントのprops定義を制御コンポーネント化する**

56行目を変更:

変更前:
```tsx
export default function ForestScene({ profiles }: { profiles: DreamProfile[] }) {
```

変更後:
```tsx
interface ForestSceneProps {
  profiles: DreamProfile[];
  selectedProfileId: number | null;
  onSelectTree: (profile: DreamProfile) => void;
  onCloseSheet: () => void;
  recentDream: Dream | null;
  loading: boolean;
}

export default function ForestScene({
  profiles,
  selectedProfileId,
  onSelectTree,
  onCloseSheet,
  recentDream,
  loading,
}: ForestSceneProps) {
```

- [ ] **Step 3: 内部の`selectedId` stateを廃止し、propsベースにする**

179〜184行目付近を変更:

変更前:
```tsx
  // 木タップ → プレビューシート（ドラッグ中は選択しない）
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = profiles.find((p) => p.id === selectedId) ?? null;
  const selectTree = (p: DreamProfile) => {
    if (!movedRef.current) setSelectedId(p.id);
  };
```

変更後:
```tsx
  // 木タップ → プレビューシート（ドラッグ中は選択しない）
  const selected = profiles.find((p) => p.id === selectedProfileId) ?? null;
  const selectTree = (p: DreamProfile) => {
    if (!movedRef.current) onSelectTree(p);
  };
```

- [ ] **Step 4: `ForestTodayCard`の浮遊表示をlg+で隠す**

240〜245行目付近を変更:

変更前:
```tsx
      {/* きょうの もり カード（右上・固定） */}
      {!isEmpty && (
        <div className="absolute right-3 top-3 z-20">
          <ForestTodayCard totalDreams={totalDreams} topProfile={topProfile} />
        </div>
      )}
```

変更後:
```tsx
      {/* きょうの もり カード（右上・固定、lg+ では TreeSidePanel が同役割を担うため隠す） */}
      {!isEmpty && (
        <div className="absolute right-3 top-3 z-20 lg:hidden">
          <ForestTodayCard totalDreams={totalDreams} topProfile={topProfile} />
        </div>
      )}
```

- [ ] **Step 5: `MiniTree`への`isSelected`判定をpropsベースにする**

317行目付近（`planted.map`内）を変更:

変更前:
```tsx
                <MiniTree
                  profile={p}
                  isSelected={selectedId === p.id}
                  onSelect={() => selectTree(p)}
                  height={Math.round((120 + lvl * 22) * getCanopyScale(lvl) * 0.9 + 80)}
                />
```

変更後:
```tsx
                <MiniTree
                  profile={p}
                  isSelected={selectedProfileId === p.id}
                  onSelect={() => selectTree(p)}
                  height={Math.round((120 + lvl * 22) * getCanopyScale(lvl) * 0.9 + 80)}
                />
```

- [ ] **Step 6: `TreePreviewSheet`呼び出しに新propsを渡す**

407〜412行目付近を変更:

変更前:
```tsx
      {/* 木タップ時のプレビューシート */}
      <TreePreviewSheet
        profile={selected}
        onOpen={(p) => router.push(`/forest/${p.id}`)}
        onClose={() => setSelectedId(null)}
      />
```

変更後:
```tsx
      {/* 木タップ時のプレビューシート（lg未満のみ表示。中身は TreeSidePanel と共通） */}
      <TreePreviewSheet
        profile={selected}
        recentDream={recentDream}
        loading={loading}
        onOpen={(p) => router.push(`/forest/${p.id}`)}
        onClose={onCloseSheet}
      />
```

- [ ] **Step 7: 型チェックと既存テストの確認**

Run: `cd frontend && yarn tsc --noEmit 2>&1 | grep -i forestscene`
Expected: 出力なし（`ForestScene.tsx`関連のエラーなし。他ファイルの既存の型エラーは無関係なので無視してよい — 別セッションで確認済みのbaselineノイズ）

Run: `cd frontend && yarn jest __tests__/components/ForestScene.test.tsx`
Expected: PASS（既存の9 tests、無変更のまま通る）

- [ ] **Step 8: コミット**

```bash
cd frontend
git add app/components/forest/ForestScene.tsx
git commit -m "refactor: ForestSceneの選択状態を制御コンポーネント化"
```

---

### Task 6: `/forest/page.tsx`を2カラム化し、状態を保有する

**Files:**
- Modify: `frontend/app/forest/page.tsx`（全面書き換え）
- Test: `frontend/__tests__/app/forest/page.test.tsx`（新規）

**Interfaces:**
- Consumes: `useRecentDream`（Task 1）、`ForestScene`の新props（Task 5）、`TreeSidePanel`（Task 4）
- Produces: なし（末端のページコンポーネント）

`ForestScene`と`TreeSidePanel`はテストではモックし、「ページが選択状態を正しく保持し両コンポーネントに配線しているか」だけを検証する（`ForestScene`実体のレンダーはTask 5の理由と同じくCanvas/ResizeObserver依存が重いため避ける）。

- [ ] **Step 1: 失敗するテストを書く**

`frontend/__tests__/app/forest/page.test.tsx`:

```tsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ForestPage from "@/app/forest/page";
import { getDreamProfiles } from "@/lib/apiClient";
import type { DreamProfile } from "@/app/types";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/context/AuthContext", () => ({
  __esModule: true,
  useAuth: () => ({ authStatus: "authenticated" }),
}));

jest.mock("@/lib/apiClient", () => ({
  __esModule: true,
  getDreamProfiles: jest.fn(),
}));

jest.mock("@/lib/toast", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/hooks/useRecentDream", () => ({
  __esModule: true,
  useRecentDream: jest.fn(() => ({ recentDream: null, loading: false })),
}));

jest.mock("@/app/components/forest/ForestGuide", () => ({
  __esModule: true,
  default: () => <div data-testid="forest-guide" />,
}));

jest.mock("@/app/components/forest/ForestScene", () => ({
  __esModule: true,
  default: ({ profiles, selectedProfileId, onSelectTree, onCloseSheet }: any) => (
    <div data-testid="forest-scene">
      <span data-testid="selected-id">{selectedProfileId ?? "none"}</span>
      {profiles.map((p: DreamProfile) => (
        <button key={p.id} onClick={() => onSelectTree(p)}>
          {`select-${p.id}`}
        </button>
      ))}
      <button onClick={onCloseSheet}>close-sheet</button>
    </div>
  ),
}));

jest.mock("@/app/components/forest/TreeSidePanel", () => ({
  __esModule: true,
  default: ({ selectedProfile }: any) => (
    <div data-testid="tree-side-panel-mock">{selectedProfile ? selectedProfile.name : "none"}</div>
  ),
}));

const mockedGetDreamProfiles = getDreamProfiles as jest.MockedFunction<typeof getDreamProfiles>;

function profile(overrides: Partial<DreamProfile> = {}): DreamProfile {
  return {
    id: 1,
    name: "自分",
    avatar_emoji: "🧑",
    color: "#8b5cf6",
    relationship: "self",
    active: true,
    position: 1,
    archived: false,
    created_at: "2026-06-14T00:00:00Z",
    updated_at: "2026-06-14T00:00:00Z",
    dreams_count: 1,
    ...overrides,
  };
}

describe("ForestPage 選択状態の配線", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetDreamProfiles.mockResolvedValue([
      profile({ id: 1, name: "自分" }),
      profile({ id: 2, name: "モカ", archived: true }),
    ]);
  });

  it("ForestSceneで木を選択するとTreeSidePanelにも同じプロフィールが伝わる", async () => {
    render(<ForestPage />);

    await waitFor(() => expect(screen.getByTestId("forest-scene")).toBeInTheDocument());
    expect(screen.getByTestId("tree-side-panel-mock")).toHaveTextContent("none");

    fireEvent.click(screen.getByRole("button", { name: "select-1" }));

    expect(screen.getByTestId("selected-id")).toHaveTextContent("1");
    expect(screen.getByTestId("tree-side-panel-mock")).toHaveTextContent("自分");
  });

  it("onCloseSheetで選択が解除される", async () => {
    render(<ForestPage />);

    await waitFor(() => expect(screen.getByTestId("forest-scene")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "select-1" }));
    expect(screen.getByTestId("tree-side-panel-mock")).toHaveTextContent("自分");

    fireEvent.click(screen.getByRole("button", { name: "close-sheet" }));

    expect(screen.getByTestId("tree-side-panel-mock")).toHaveTextContent("none");
  });

  it("archivedプロフィールはForestSceneに渡す前に除外される", async () => {
    render(<ForestPage />);

    await waitFor(() => expect(screen.getByTestId("forest-scene")).toBeInTheDocument());

    expect(screen.getByRole("button", { name: "select-1" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "select-2" })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `cd frontend && yarn jest __tests__/app/forest/page.test.tsx`
Expected: FAIL（`ForestScene`に渡している`selectedProfileId`等のpropsが未配線、または`TreeSidePanel`が描画されない）

- [ ] **Step 3: ページを書き換える**

`frontend/app/forest/page.tsx`（既存ファイルを以下で置き換える）:

```tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Loading from "@/app/loading";
import { getDreamProfiles } from "@/lib/apiClient";
import type { DreamProfile } from "@/app/types";
import { toast } from "@/lib/toast";
import { useRecentDream } from "@/hooks/useRecentDream";
import ForestScene from "@/app/components/forest/ForestScene";
import ForestGuide from "@/app/components/forest/ForestGuide";
import TreeSidePanel from "@/app/components/forest/TreeSidePanel";

export default function ForestPage() {
  const { authStatus } = useAuth();
  const router = useRouter();
  const [profiles, setProfiles] = useState<DreamProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getDreamProfiles();
      setProfiles(data.filter((p) => !p.archived)); // 森は active のみ
    } catch {
      toast.error("もりを よみこめませんでした。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (authStatus === "authenticated") load();
  }, [authStatus, load, router]);

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId]
  );
  const { recentDream, loading: recentDreamLoading } = useRecentDream(selectedProfileId);

  const totalDreams = profiles.reduce((s, p) => s + (p.dreams_count ?? 0), 0);
  const topProfile = profiles.reduce<DreamProfile | null>((top, p) => {
    if ((p.dreams_count ?? 0) === 0) return top;
    if (!top || (p.dreams_count ?? 0) > (top.dreams_count ?? 0)) return p;
    return top;
  }, null);

  const openProfile = useCallback((p: DreamProfile) => router.push(`/forest/${p.id}`), [router]);

  if (authStatus === "checking") return <Loading />;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <main className="container mx-auto max-w-3xl space-y-4 px-4 py-6 lg:max-w-6xl">
        <h1 className="text-xl font-bold">ゆめの もり</h1>
        <p className="text-sm text-muted-foreground">
          みんなの ゆめが きに なって そだっていくよ。きを タップしてみてね。
        </p>
        {isLoading ? (
          <div className="h-[70vh] animate-pulse rounded-3xl bg-muted" />
        ) : (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
            <div className="min-w-0 flex-1">
              <ForestScene
                profiles={profiles}
                selectedProfileId={selectedProfileId}
                onSelectTree={(p) => setSelectedProfileId(p.id)}
                onCloseSheet={() => setSelectedProfileId(null)}
                recentDream={recentDream}
                loading={recentDreamLoading}
              />
            </div>
            <TreeSidePanel
              profiles={profiles}
              selectedProfile={selectedProfile}
              recentDream={recentDream}
              loading={recentDreamLoading}
              totalDreams={totalDreams}
              topProfile={topProfile}
              onOpen={openProfile}
              onClose={() => setSelectedProfileId(null)}
            />
          </div>
        )}
      </main>
      {!isLoading && <ForestGuide variant="forest" profiles={profiles} />}
    </div>
  );
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `cd frontend && yarn jest __tests__/app/forest/page.test.tsx`
Expected: PASS（3 tests）

- [ ] **Step 5: コミット**

```bash
cd frontend
git add app/forest/page.tsx __tests__/app/forest/page.test.tsx
git commit -m "feat: /forestページをlg+2カラム化しTreeSidePanelを組み込む"
```

---

### Task 7: E2Eをモバイル/デスクトップに分割し、デスクトップケースを追加

**Files:**
- Modify: `frontend/e2e/forest-flow.spec.ts`

**Interfaces:**
- Consumes: なし（ブラウザ経由の統合テスト）

**重要な前提:** `playwright.config.ts`は`devices["Desktop Chrome"]`を使っており、デフォルトビューポートは**1280×720（lg+相当）**。つまり既存テストは何も指定しなければ**既にlg+幅で実行されている**。Task 3で`TreePreviewSheet`に`lg:hidden`を付けたため、既存テストをそのままにすると「この きを 見る ›」ボタンが非表示になり壊れる。そのため既存テストは明示的に狭い viewport（`test.use`）へ固定し、新たにデフォルト幅（lg+）のデスクトップケースを追加する。

さらに、`TreePreviewSheet`と`TreeSidePanel`は両方とも常時DOMにマウントされる設計（`lg:hidden`/`hidden lg:flex`で出し分け）なので、「この きを 見る ›」ボタンや「きょうの もり」の文言はページ内に**2箇所**存在しうる。Playwrightは`getByRole`/`getByText`が複数要素にマッチするとstrict modeエラーになるため、Task 3・Task 4で追加した`data-testid="tree-preview-sheet"`／`data-testid="tree-side-panel"`でスコープして曖昧さを避ける。

- [ ] **Step 1: 既存テストをモバイルdescribeへ移し、デスクトップdescribeを追加する**

`frontend/e2e/forest-flow.spec.ts`の100〜120行目（`test("森 → 木タップ → プレビューシート → 詳細へ遷移できる", ...)`ブロック全体）を、以下で置き換える:

変更前:
```ts
  test("森 → 木タップ → プレビューシート → 詳細へ遷移できる", async ({ page }) => {
    await page.goto("/forest");

    await expect(
      page.getByRole("heading", { name: "ゆめの もり" })
    ).toBeVisible();

    // 「自分」の木をタップ → 下からプレビューシートが出る（直接遷移ではない）
    await page.getByRole("button", { name: /自分の き/ }).first().click();

    // プレビューシートの「この きを 見る ›」で詳細へ遷移
    const seeTreeButton = page.getByRole("button", { name: /この きを 見る/ });
    await expect(seeTreeButton).toBeVisible();
    await seeTreeButton.click();

    // dev サーバーは /forest/[id] を初回オンデマンドコンパイルするため、
    // 遷移完了まで余裕を持って待つ（既定5秒だと初回コンパイルに間に合わずflakyになる）
    await expect(page).toHaveURL(/\/forest\/1$/, { timeout: 30000 });
    await expect(page.getByRole("heading", { name: /の き$/ })).toBeVisible();
  });
});
```

変更後:
```ts
  test.describe("モバイル幅（下シート）", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("森 → 木タップ → プレビューシート → 詳細へ遷移できる", async ({ page }) => {
      await page.goto("/forest");

      await expect(
        page.getByRole("heading", { name: "ゆめの もり" })
      ).toBeVisible();

      // 「自分」の木をタップ → 下からプレビューシートが出る（直接遷移ではない）
      await page.getByRole("button", { name: /自分の き/ }).first().click();

      // プレビューシート内の「この きを 見る ›」で詳細へ遷移
      const sheet = page.getByTestId("tree-preview-sheet");
      const seeTreeButton = sheet.getByRole("button", { name: /この きを 見る/ });
      await expect(seeTreeButton).toBeVisible();
      await seeTreeButton.click();

      // dev サーバーは /forest/[id] を初回オンデマンドコンパイルするため、
      // 遷移完了まで余裕を持って待つ（既定5秒だと初回コンパイルに間に合わずflakyになる）
      await expect(page).toHaveURL(/\/forest\/1$/, { timeout: 30000 });
      await expect(page.getByRole("heading", { name: /の き$/ })).toBeVisible();
    });
  });

  test.describe("デスクトップ幅（常駐サイドパネル）", () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test("森 → 木クリック → 右パネルにプレビュー表示 → 詳細へ遷移できる", async ({ page }) => {
      await page.goto("/forest");

      await expect(
        page.getByRole("heading", { name: "ゆめの もり" })
      ).toBeVisible();

      const panel = page.getByTestId("tree-side-panel");

      // 未選択時は右パネルに「きょうの もり」が出ている
      await expect(panel.getByText("きょうの もり")).toBeVisible();

      // 「自分」の木をクリック → 右パネルにプレビューが表示される
      await page.getByRole("button", { name: /自分の き/ }).first().click();

      const seeTreeButton = panel.getByRole("button", { name: /この きを 見る/ });
      await expect(seeTreeButton).toBeVisible();
      await seeTreeButton.click();

      await expect(page).toHaveURL(/\/forest\/1$/, { timeout: 30000 });
      await expect(page.getByRole("heading", { name: /の き$/ })).toBeVisible();
    });
  });
});
```

- [ ] **Step 2: E2Eを単一ワーカーで実行し、両方のケースが通ることを確認する**

Run: `cd frontend && npx playwright test e2e/forest-flow.spec.ts --workers=1`
Expected: `2 passed`

- [ ] **Step 3: コミット**

```bash
cd frontend
git add e2e/forest-flow.spec.ts
git commit -m "test: forest-flow E2Eをモバイル/デスクトップに分割しデスクトップケースを追加"
```

---

### Task 8: 全体検証

**Files:** なし（検証のみ）

- [ ] **Step 1: 対象ユニットテストを一括実行する**

Run:
```bash
cd frontend && yarn jest __tests__/hooks/useRecentDream.test.tsx __tests__/components/TreePreviewContent.test.tsx __tests__/components/TreePreviewSheet.test.tsx __tests__/components/TreeSidePanel.test.tsx __tests__/components/ForestScene.test.tsx __tests__/app/forest/page.test.tsx
```
Expected: 全てPASS

- [ ] **Step 2: Jest全体を実行する**

Run: `cd frontend && yarn jest`
Expected: 全suite PASS（新規追加分を含め、既存分に regressions がないこと）

- [ ] **Step 3: `tsc --noEmit`を実行する**

Run: `cd frontend && yarn tsc --noEmit`
Expected: 今回変更したファイル（`ForestScene.tsx`／`TreePreviewSheet.tsx`／`TreePreviewContent.tsx`／`TreeSidePanel.tsx`／`useRecentDream.ts`／`forest/page.tsx`）に起因するエラーがないこと。`__tests__/**`配下の既存の広域型エラー（`jest.MockedFunction`等、tsconfigの`types`に`jest`が含まれないことに起因）は本変更と無関係のbaselineノイズなので無視してよい

- [ ] **Step 4: E2Eを単一ワーカーで実行する**

Run: `cd frontend && npx playwright test e2e/forest-flow.spec.ts --workers=1`
Expected: `2 passed`

- [ ] **Step 5: production buildを実行する**

Run: `cd frontend && yarn build`
Expected: 成功、`/forest`が静的/動的生成のリストに出ること

- [ ] **Step 6: `git diff --check`を実行する**

Run: `git diff --check`
Expected: 出力なし（末尾空白等の混入なし）

- [ ] **Step 7: ブラウザで実機確認する**

Browser preview（`mcp__Claude_Browser__*`）で`/forest`を以下の3幅で確認する:
- 375px: モバイル1カラム、木タップで下シートが開く、パネルは出ない（現状と見た目が変わらないこと）
- 768px: lg未満なのでモバイルと同じ1カラム（`ForestTodayCard`が右上に浮遊表示されること）
- 1440px: 左に森キャンバス、右に常駐`TreeSidePanel`。未選択時は「きょうの もり」、木をクリックするとプレビューに切り替わり、下シートは出ないこと

ダークモードでの見た目も1440px幅で確認する。

- [ ] **Step 8: 最終コミット（検証のみで差分がなければスキップ）**

差分が発生していなければコミット不要。もし検証中に軽微な修正を加えた場合はそのファイルのみをコミットする。
