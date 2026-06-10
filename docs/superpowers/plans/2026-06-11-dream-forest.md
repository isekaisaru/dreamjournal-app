# 夢の森（プロフィール別 夢の木）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** プロフィール（自分・家族・ペット）ごとの「夢の木」が並ぶ夢の森を作り、夢を書くほど木が育ち、最近の夢が光る実として実り、タップで夢が開く体験を提供する。

**Architecture:** バックエンドは `GET /dream_profiles` に `dreams_count` を足すだけ。あとは既存の `GET /dreams?dream_profile_id=` を再利用。フロントは `/forest`（森ビュー）と `/forest/[profileId]`（1本の木）の2ページ＋森用コンポーネント群＋純粋関数 `lib/forest.ts`。演出は framer-motion（導入済み）。マスコット「モルペウス」を案内人として配置。

**Tech Stack:** Rails (RSpec) / Next.js App Router + TypeScript / Jest + Testing Library / framer-motion / Tailwind / Playwright

設計の元仕様: [docs/superpowers/specs/2026-06-11-dream-forest-design.md](../specs/2026-06-11-dream-forest-design.md)

---

## ファイル構成

### バックエンド（変更）
- `backend/app/controllers/dream_profiles_controller.rb` — index で `dreams_count` を 1 クエリ取得して `profile_json` に合成
- `backend/spec/requests/dream_profiles_spec.rb` — `dreams_count` のテスト追加

### フロント（新規）
- `frontend/lib/forest.ts` — 育ちレベル・実の位置・実の色の純粋関数
- `frontend/app/forest/page.tsx` — 森ビュー
- `frontend/app/forest/[profileId]/page.tsx` — 1本の木
- `frontend/app/components/forest/ForestScene.tsx` — 星空・地面・パララックス舞台
- `frontend/app/components/forest/MiniTree.tsx` — 森に並ぶ小さい木
- `frontend/app/components/forest/DreamTree.tsx` — 大きい1本の木
- `frontend/app/components/forest/DreamFruit.tsx` — 光る実1個
- `frontend/app/components/forest/PastDreamsList.tsx` — 昔の夢リスト
- `frontend/app/components/forest/ForestGuide.tsx` — モルペウス案内人
- `frontend/app/components/forest/HarvestCelebration.tsx` — 保存直後のお祝い

### フロント（変更）
- `frontend/app/types.ts` — `DreamProfile.dreams_count` 追加
- `frontend/lib/apiClient.ts` — `getDreamsForProfile` 追加
- `frontend/app/components/AuthNav.tsx` — 「🌳もり」NavItem 追加
- `frontend/app/components/DreamForm.tsx` — 保存成功で HarvestCelebration 起動

### テスト（新規）
- `frontend/__tests__/lib/forest.test.ts`
- `frontend/e2e/forest-flow.spec.ts`

---

## Phase 1: バックエンド `dreams_count`

### Task 1: dream_profiles index に dreams_count を返す

**Files:**
- Modify: `backend/app/controllers/dream_profiles_controller.rb`
- Test: `backend/spec/requests/dream_profiles_spec.rb`

- [ ] **Step 1: 失敗するテストを書く**

`backend/spec/requests/dream_profiles_spec.rb` の `describe 'GET /dream_profiles'` 内、`context '認証済みユーザーの場合'` の `before` ブロックの**後ろ**に追記する。

```ruby
      it '各プロフィールに dreams_count を含む' do
        self_profile = DreamProfile.find_by(user: user, name: "自分")
        create(:dream, user: user, dream_profile: self_profile)
        create(:dream, user: user, dream_profile: self_profile)

        authenticated_get('/dream_profiles', user)

        json = JSON.parse(response.body)
        self_json = json.find { |p| p['name'] == '自分' }
        partner_json = json.find { |p| p['name'] == 'パートナー' }
        expect(self_json['dreams_count']).to eq(2)
        expect(partner_json['dreams_count']).to eq(0)
      end
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `cd backend && bundle exec rspec spec/requests/dream_profiles_spec.rb -e 'dreams_count を含む'`
Expected: FAIL（`dreams_count` が nil）

- [ ] **Step 3: 最小実装**

`dream_profiles_controller.rb` の `index` と `profile_json` を変更する。`index` でまとめて件数を引き（N+1 を避ける）、`profile_json` に第2引数で渡す。

```ruby
  # GET /dream_profiles
  def index
    profiles = current_user.dream_profiles.order(:position, :created_at)
    counts = current_user.dreams.group(:dream_profile_id).count
    render json: profiles.map { |p| profile_json(p, counts.fetch(p.id, 0)) }
  end
```

`profile_json` を変更（`create`/`update`/`archive`/`restore` も呼ぶので、件数省略時は単発クエリでフォールバック）:

```ruby
  def profile_json(profile, dreams_count = nil)
    dreams_count ||= profile.dreams.count
    profile.as_json(
      only: %i[id name avatar_emoji color relationship active position created_at updated_at]
    ).merge("archived" => !profile.active, "dreams_count" => dreams_count)
  end
```

> 注: `DreamProfile` に `has_many :dreams` が無い場合は `app/models/dream_profile.rb` に `has_many :dreams, dependent: :nullify` を追加する。まず `grep -n "has_many :dreams" backend/app/models/dream_profile.rb` で確認。`dreams.dream_profile_id` は nullable なので `dependent: :nullify` が安全。

- [ ] **Step 4: テストを実行して成功を確認**

Run: `cd backend && bundle exec rspec spec/requests/dream_profiles_spec.rb`
Expected: PASS（全グリーン）

- [ ] **Step 5: コミット**

```bash
git add backend/app/controllers/dream_profiles_controller.rb backend/app/models/dream_profile.rb backend/spec/requests/dream_profiles_spec.rb
git commit -m "feat: dream_profiles APIにdreams_countを追加"
```

---

## Phase 2: 純粋関数 `lib/forest.ts`

### Task 2: 育ちレベル・実の色・実の位置の純粋関数

**Files:**
- Create: `frontend/lib/forest.ts`
- Test: `frontend/__tests__/lib/forest.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`frontend/__tests__/lib/forest.test.ts`:

```ts
import {
  getGrowthLevel,
  getCanopyScale,
  fruitPosition,
  fruitColor,
  RECENT_FRUIT_COUNT,
} from "../../lib/forest";

describe("getGrowthLevel", () => {
  it.each([
    [0, 0],
    [1, 1],
    [4, 1],
    [5, 2],
    [14, 2],
    [15, 3],
    [29, 3],
    [30, 4],
    [59, 4],
    [60, 5],
    [999, 5],
  ])("夢 %i 件 → レベル %i", (count, level) => {
    expect(getGrowthLevel(count).level).toBe(level);
  });

  it("各レベルに名前と絵文字がある", () => {
    expect(getGrowthLevel(10).name).toBeTruthy();
    expect(getGrowthLevel(10).emoji).toBeTruthy();
  });
});

describe("getCanopyScale", () => {
  it("レベルが上がるほど大きく、単調増加する", () => {
    const scales = [0, 1, 2, 3, 4, 5].map(getCanopyScale);
    for (let i = 1; i < scales.length; i++) {
      expect(scales[i]).toBeGreaterThanOrEqual(scales[i - 1]);
    }
  });
});

describe("fruitPosition", () => {
  it("同じ dreamId なら毎回同じ座標（決定的）", () => {
    const a = fruitPosition(42, 0);
    const b = fruitPosition(42, 0);
    expect(a).toEqual(b);
  });

  it("座標は 0〜100 の % に収まる", () => {
    for (let id = 1; id <= 20; id++) {
      const p = fruitPosition(id, id % RECENT_FRUIT_COUNT);
      expect(p.xPct).toBeGreaterThanOrEqual(0);
      expect(p.xPct).toBeLessThanOrEqual(100);
      expect(p.yPct).toBeGreaterThanOrEqual(0);
      expect(p.yPct).toBeLessThanOrEqual(100);
    }
  });
});

describe("fruitColor", () => {
  it("感情があればその色、なければプロフィール色にフォールバック", () => {
    const withEmotion = fruitColor(
      { id: 1, emotions: [{ id: 1, name: "喜び" }] } as any,
      "#6366f1"
    );
    const withoutEmotion = fruitColor({ id: 2, emotions: [] } as any, "#6366f1");
    expect(withEmotion).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(withoutEmotion).toBe("#6366f1");
  });
});
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `cd frontend && npx jest forest.test.ts`
Expected: FAIL（`lib/forest` が無い）

- [ ] **Step 3: 最小実装**

`frontend/lib/forest.ts`:

```ts
import type { Dream } from "@/app/types";

/** 1本の木にタップ可能な「実」として表示する最近の夢の数 */
export const RECENT_FRUIT_COUNT = 12;

export interface GrowthLevel {
  level: number;
  name: string;
  emoji: string;
}

// 夢の総数で「育ちレベル」を決める。境界値は仕様書 §3 に対応。
const LEVELS: { min: number; level: GrowthLevel }[] = [
  { min: 60, level: { level: 5, name: "古木", emoji: "🌲" } },
  { min: 30, level: { level: 4, name: "大樹", emoji: "🌳" } },
  { min: 15, level: { level: 3, name: "木", emoji: "🌳" } },
  { min: 5, level: { level: 2, name: "若木", emoji: "🌿" } },
  { min: 1, level: { level: 1, name: "苗", emoji: "🌱" } },
  { min: 0, level: { level: 0, name: "芽", emoji: "🌱" } },
];

export function getGrowthLevel(count: number): GrowthLevel {
  return (LEVELS.find((l) => count >= l.min) ?? LEVELS[LEVELS.length - 1]).level;
}

// 茂みの大きさの倍率。レベル0=0.45 〜 レベル5=1.3 で頭打ち。
export function getCanopyScale(level: number): number {
  const table = [0.45, 0.6, 0.75, 0.9, 1.1, 1.3];
  return table[Math.max(0, Math.min(level, table.length - 1))];
}

// dreamId を種にした決定的な擬似乱数（mulberry32）。
// 同じ夢は常に同じ場所に実る＝再描画で動かない。
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface FruitPos {
  xPct: number; // 茂みコンテナ内の左からの%
  yPct: number; // 茂みコンテナ内の上からの%
}

// 楕円状の茂みの内側に散らす。index も種に混ぜて被りを減らす。
export function fruitPosition(dreamId: number, index: number): FruitPos {
  const rand = seededRandom(dreamId * 97 + index * 31 + 7);
  const angle = rand() * Math.PI * 2;
  const radius = 0.35 + rand() * 0.45; // 中心寄りすぎ・端すぎを避ける
  const xPct = 50 + Math.cos(angle) * radius * 45;
  const yPct = 45 + Math.sin(angle) * radius * 38;
  return {
    xPct: Math.max(0, Math.min(100, xPct)),
    yPct: Math.max(0, Math.min(100, yPct)),
  };
}

// 感情名 → 実の色。無ければプロフィール色にフォールバック。
const EMOTION_COLORS: Record<string, string> = {
  喜び: "#fbbf24",
  楽しい: "#f59e0b",
  幸せ: "#fb7185",
  愛: "#ec4899",
  安心: "#34d399",
  期待: "#22d3ee",
  驚き: "#a78bfa",
  悲しい: "#60a5fa",
  不安: "#818cf8",
  怒り: "#f87171",
  恐怖: "#9333ea",
  混乱: "#94a3b8",
};

export function fruitColor(dream: Pick<Dream, "id" | "emotions">, profileColor: string): string {
  const first = dream.emotions?.[0]?.name;
  if (first && EMOTION_COLORS[first]) return EMOTION_COLORS[first];
  return profileColor;
}
```

- [ ] **Step 4: テストを実行して成功を確認**

Run: `cd frontend && npx jest forest.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add frontend/lib/forest.ts frontend/__tests__/lib/forest.test.ts
git commit -m "feat: 夢の木の育ちレベル・実の配置の純粋関数を追加"
```

---

## Phase 3: 型・APIクライアント・ナビ入口

### Task 3: 型とAPIクライアントを追加

**Files:**
- Modify: `frontend/app/types.ts`
- Modify: `frontend/lib/apiClient.ts`

- [ ] **Step 1: `DreamProfile` に `dreams_count` を足す**

`frontend/app/types.ts` の `DreamProfile` インターフェースに追記:

```ts
  updated_at: string;
  dreams_count?: number; // 夢の森で木の大きさに使う（/dream_profiles が返す）
}
```

- [ ] **Step 2: `getDreamsForProfile` を追加**

`frontend/lib/apiClient.ts` の `getDreamProfiles` の近くに追加（Cookie 認証で動く既存パターンに合わせる）:

```ts
/** あるプロフィールの夢を新しい順で全件取得する（夢の木用）。 */
export async function getDreamsForProfile(profileId: number): Promise<Dream[]> {
  return apiFetch<Dream[]>(`/dreams?dream_profile_id=${profileId}`, {
    cache: "no-store",
  });
}
```

`Dream` が未 import なら import 行に追加する（`import { ... Dream ... } from "@/app/types"` を確認）。

- [ ] **Step 3: 型チェック**

Run: `cd frontend && npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git add frontend/app/types.ts frontend/lib/apiClient.ts
git commit -m "feat: 夢の木用にdreams_count型とgetDreamsForProfileを追加"
```

### Task 4: ヘッダーに「🌳もり」入口を追加

**Files:**
- Modify: `frontend/app/components/AuthNav.tsx`

- [ ] **Step 1: アイコン import に `Trees` を足す**

`lucide-react` の import に `Trees` を追加:

```ts
import {
  House,
  Trees,
  Settings,
  LogOut,
  LogIn,
  Sparkles,
  Loader2,
} from "lucide-react";
```

- [ ] **Step 2: NavItem を追加**

「おうち」の NavItem の直後（同じ左側グループ内）に追加:

```tsx
        <NavItem href="/home" icon={House} label="おうち" />
        <NavItem href="/forest" icon={Trees} label="もり" />
```

- [ ] **Step 3: 動作確認（dev server）**

Run: dev server を起動し、ログイン後ヘッダーに「🌳もり」が出てクリックで `/forest` に飛ぶこと（このStepではページは未作成なので404でOK。リンクの存在を確認）。

- [ ] **Step 4: コミット**

```bash
git add frontend/app/components/AuthNav.tsx
git commit -m "feat: ヘッダーに夢の森への入口を追加"
```

---

## Phase 4: 森ビュー `/forest`

### Task 5: ForestScene と MiniTree

**Files:**
- Create: `frontend/app/components/forest/ForestScene.tsx`
- Create: `frontend/app/components/forest/MiniTree.tsx`

- [ ] **Step 1: MiniTree を作る**

`frontend/app/components/forest/MiniTree.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { DreamProfile } from "@/app/types";
import { getGrowthLevel, getCanopyScale } from "@/lib/forest";

export default function MiniTree({ profile }: { profile: DreamProfile }) {
  const router = useRouter();
  const count = profile.dreams_count ?? 0;
  const { level, name } = getGrowthLevel(count);
  const scale = getCanopyScale(level);

  return (
    <motion.button
      type="button"
      onClick={() => router.push(`/forest/${profile.id}`)}
      className="relative flex flex-col items-center justify-end focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl px-2"
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.97 }}
      aria-label={`${profile.name} の木（夢 ${count} 件・${name}）を見る`}
    >
      {/* 茂み（ゆっくり呼吸するように揺れる） */}
      <motion.div
        className="rounded-full"
        style={{
          width: 96 * scale,
          height: 96 * scale,
          background: `radial-gradient(circle at 40% 35%, ${profile.color}cc, ${profile.color}55 70%, transparent)`,
          boxShadow: `0 0 28px ${profile.color}55`,
        }}
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <span
          className="flex items-center justify-center w-full h-full text-2xl"
          aria-hidden
        >
          {profile.avatar_emoji}
        </span>
      </motion.div>
      {/* 幹 */}
      <div className="w-2.5 rounded-b-sm bg-[#6b4a2b]" style={{ height: 18 + level * 4 }} />
      {/* 名前と件数 */}
      <span className="mt-1 text-xs font-semibold text-foreground/90">{profile.name}</span>
      <span className="text-[10px] text-muted-foreground">夢 {count}</span>
    </motion.button>
  );
}
```

- [ ] **Step 2: ForestScene を作る**

`frontend/app/components/forest/ForestScene.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import type { DreamProfile } from "@/app/types";
import MiniTree from "./MiniTree";

/** 星をランダムだが固定の位置でちりばめる（再描画で動かないよう useMemo 相当で固定） */
const STARS = Array.from({ length: 40 }, (_, i) => ({
  left: (i * 53) % 100,
  top: (i * 37) % 70,
  delay: (i % 7) * 0.4,
  size: (i % 3) + 1,
}));

export default function ForestScene({ profiles }: { profiles: DreamProfile[] }) {
  return (
    <div className="relative min-h-[70vh] overflow-hidden rounded-3xl bg-gradient-to-b from-[#241a40] via-[#1a1336] to-[#0e0a1c]">
      {/* 星空 */}
      {STARS.map((s, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size }}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, delay: s.delay }}
        />
      ))}
      {/* 月 */}
      <div className="absolute right-8 top-8 h-16 w-16 rounded-full bg-[#fef3c7] shadow-[0_0_50px_20px_rgba(254,243,199,0.35)]" />

      {/* 地面 */}
      <div className="absolute bottom-0 h-28 w-full bg-gradient-to-t from-[#2a2150] to-transparent" />

      {/* 木を並べる */}
      <div className="relative z-10 flex flex-wrap items-end justify-center gap-6 px-6 pb-16 pt-24">
        {profiles.map((p) => (
          <MiniTree key={p.id} profile={p} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: コミット**

```bash
git add frontend/app/components/forest/
git commit -m "feat: 夢の森の舞台とミニツリーを追加"
```

### Task 6: `/forest` ページ

**Files:**
- Create: `frontend/app/forest/page.tsx`

- [ ] **Step 1: ページを作る**

既存の `frontend/app/profiles/page.tsx` の認証・取得パターンに合わせる。

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Loading from "@/app/loading";
import { getDreamProfiles } from "@/lib/apiClient";
import type { DreamProfile } from "@/app/types";
import { toast } from "@/lib/toast";
import ForestScene from "@/app/components/forest/ForestScene";
import ForestGuide from "@/app/components/forest/ForestGuide";

export default function ForestPage() {
  const { authStatus } = useAuth();
  const router = useRouter();
  const [profiles, setProfiles] = useState<DreamProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  if (authStatus === "checking") return <Loading />;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <main className="container max-w-3xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-xl font-bold">ゆめの もり</h1>
        <p className="text-sm text-muted-foreground">
          みんなの ゆめが きに なって そだっていくよ。きを タップしてみてね。
        </p>
        {isLoading ? (
          <div className="h-[70vh] rounded-3xl bg-muted animate-pulse" />
        ) : (
          <ForestScene profiles={profiles} />
        )}
      </main>
      <ForestGuide variant="forest" profiles={profiles} />
    </div>
  );
}
```

> `ForestGuide` は Task 9 で作る。先にこのページを動かしたい場合は、Task 9 まで `<ForestGuide ... />` 行と import をコメントアウトしておき、Task 9 完了時に戻す。

- [ ] **Step 2: 動作確認（dev server）**

Run: dev server で `/forest` を開く。星空・月・地面の上に、プロフィールごとの木が大きさ違いで並ぶ。木クリックで `/forest/[id]`（次フェーズで作成、未作成なら404）。
`preview_screenshot` で見た目を確認。

- [ ] **Step 3: コミット**

```bash
git add frontend/app/forest/page.tsx
git commit -m "feat: 夢の森ビューページを追加"
```

---

## Phase 5: 1本の木 `/forest/[profileId]`（実タップ→夢詳細・昔の夢リスト）

### Task 7: DreamFruit と DreamTree

**Files:**
- Create: `frontend/app/components/forest/DreamFruit.tsx`
- Create: `frontend/app/components/forest/DreamTree.tsx`

- [ ] **Step 1: DreamFruit を作る**

`frontend/app/components/forest/DreamFruit.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { Dream } from "@/app/types";
import { fruitPosition, fruitColor } from "@/lib/forest";

export default function DreamFruit({
  dream,
  index,
  profileColor,
}: {
  dream: Dream;
  index: number;
  profileColor: string;
}) {
  const router = useRouter();
  const pos = fruitPosition(dream.id, index);
  const color = fruitColor(dream, profileColor);

  return (
    <motion.button
      type="button"
      onClick={() => router.push(`/dreams/${dream.id}`)}
      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      style={{
        left: `${pos.xPct}%`,
        top: `${pos.yPct}%`,
        width: 18,
        height: 18,
        background: color,
        boxShadow: `0 0 10px 2px ${color}`,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: [1, 1.18, 1], opacity: 1 }}
      transition={{
        scale: { duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: index * 0.12 },
        opacity: { duration: 0.4, delay: index * 0.05 },
      }}
      whileHover={{ scale: 1.5 }}
      whileTap={{ scale: 0.85 }}
      aria-label={`夢「${dream.title}」を開く`}
    />
  );
}
```

> 夢詳細の URL は既存ルートに合わせる。`grep -rn "dreams/\[" frontend/app` で実際の詳細ページのパスを確認し、`/dreams/${dream.id}` を実際の形（例 `/dreams/${id}` か `/home/dreams/${id}`）に合わせること。

- [ ] **Step 2: DreamTree を作る**

`frontend/app/components/forest/DreamTree.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import type { Dream, DreamProfile } from "@/app/types";
import { getGrowthLevel, getCanopyScale, RECENT_FRUIT_COUNT } from "@/lib/forest";
import DreamFruit from "./DreamFruit";

export default function DreamTree({
  profile,
  dreams,
}: {
  profile: DreamProfile;
  dreams: Dream[];
}) {
  const { level, name, emoji } = getGrowthLevel(dreams.length);
  const scale = getCanopyScale(level);
  const recent = dreams.slice(0, RECENT_FRUIT_COUNT); // 新しい順で先頭が最近

  return (
    <div className="relative mx-auto flex w-full max-w-md flex-col items-center">
      {/* 育ちレベル */}
      <span
        className="mb-3 rounded-full bg-black/40 px-3 py-1 text-xs text-amber-100"
        aria-live="polite"
      >
        {emoji} {name}・夢 {dreams.length}
      </span>

      {/* 茂み＋実 */}
      <motion.div
        className="relative"
        style={{ width: 280 * scale, height: 240 * scale }}
        animate={{ rotate: [-1, 1, -1] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <div
          className="absolute inset-0 rounded-[48%]"
          style={{
            background: `radial-gradient(circle at 42% 38%, ${profile.color}dd, ${profile.color}66 65%, transparent)`,
            boxShadow: `0 0 60px ${profile.color}55`,
          }}
        />
        {recent.map((d, i) => (
          <DreamFruit key={d.id} dream={d} index={i} profileColor={profile.color} />
        ))}
      </motion.div>

      {/* 幹 */}
      <div
        className="rounded-b bg-[#6b4a2b]"
        style={{ width: 16 + level * 3, height: 70 + level * 8 }}
      />
      <div className="h-2 w-40 rounded-full bg-[#2a2150]" />
    </div>
  );
}
```

- [ ] **Step 3: コミット**

```bash
git add frontend/app/components/forest/DreamFruit.tsx frontend/app/components/forest/DreamTree.tsx
git commit -m "feat: 1本の夢の木と光る実コンポーネントを追加"
```

### Task 8: PastDreamsList と `/forest/[profileId]` ページ

**Files:**
- Create: `frontend/app/components/forest/PastDreamsList.tsx`
- Create: `frontend/app/forest/[profileId]/page.tsx`

- [ ] **Step 1: PastDreamsList を作る**

`frontend/app/components/forest/PastDreamsList.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import type { Dream } from "@/app/types";
import { todayLabel } from "@/lib/date"; // 既存の日付ユーティリティに合わせる（無ければ下記注記参照）

export default function PastDreamsList({ dreams }: { dreams: Dream[] }) {
  const [open, setOpen] = useState(false);
  if (dreams.length === 0) return null;

  return (
    <section className="mx-auto mt-8 w-full max-w-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-border/50 bg-card/60 px-4 py-3 text-sm font-medium"
      >
        <span>むかしの ゆめ（{dreams.length}件）</span>
        <span className="text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <ul className="mt-2 space-y-1">
          {dreams.map((d) => (
            <li key={d.id}>
              <Link
                href={`/dreams/${d.id}`}
                className="block truncate rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {d.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

> `todayLabel` import は使わないなら削除してよい（日付表示を足したい場合のみ `frontend/lib/date.ts` の実関数名を確認して使う）。夢詳細リンクは Task 7 の注記と同じパスに合わせる。

- [ ] **Step 2: `/forest/[profileId]` ページを作る**

`frontend/app/forest/[profileId]/page.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Loading from "@/app/loading";
import { getDreamProfiles, getDreamsForProfile } from "@/lib/apiClient";
import type { Dream, DreamProfile } from "@/app/types";
import { RECENT_FRUIT_COUNT } from "@/lib/forest";
import { toast } from "@/lib/toast";
import DreamTree from "@/app/components/forest/DreamTree";
import PastDreamsList from "@/app/components/forest/PastDreamsList";
import ForestGuide from "@/app/components/forest/ForestGuide";

export default function ForestProfilePage() {
  const { authStatus } = useAuth();
  const router = useRouter();
  const params = useParams();
  const profileId = Number(params.profileId);

  const [profile, setProfile] = useState<DreamProfile | null>(null);
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allProfiles, profileDreams] = await Promise.all([
        getDreamProfiles(),
        getDreamsForProfile(profileId),
      ]);
      const found = allProfiles.find((p) => p.id === profileId && !p.archived);
      if (!found) {
        router.replace("/forest"); // 他人/存在しない/アーカイブ済みは森へ
        return;
      }
      setProfile(found);
      setDreams(profileDreams);
    } catch {
      toast.error("きを よみこめませんでした。");
    } finally {
      setIsLoading(false);
    }
  }, [profileId, router]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (authStatus === "authenticated") load();
  }, [authStatus, load, router]);

  if (authStatus === "checking" || isLoading) return <Loading />;
  if (!profile) return null;

  const pastDreams = dreams.slice(RECENT_FRUIT_COUNT);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#241a40] via-[#1a1336] to-[#0e0a1c] text-white pb-24">
      <header className="sticky top-0 z-10 backdrop-blur-md bg-black/20">
        <div className="container max-w-3xl mx-auto px-4 h-14 flex items-center">
          <Link href="/forest" className="flex items-center text-white/80 hover:text-white">
            <ChevronLeft className="w-5 h-5 mr-1" /> もり
          </Link>
          <h1 className="ml-3 text-lg font-bold">
            {profile.avatar_emoji} {profile.name} の き
          </h1>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 pt-10">
        {dreams.length === 0 ? (
          <p className="mt-20 text-center text-white/70">
            まだ ゆめが ないよ。ゆめを かいて きを そだてよう。
          </p>
        ) : (
          <DreamTree profile={profile} dreams={dreams} />
        )}
        <PastDreamsList dreams={pastDreams} />
      </main>

      <ForestGuide variant="tree" profile={profile} dreamCount={dreams.length} />
    </div>
  );
}
```

- [ ] **Step 3: 動作確認（dev server）**

Run: `/forest` で木をクリック → 1本の木が表示。最近の実をクリックで夢詳細へ。13件以上ある場合「むかしの ゆめ」を開いて古い夢に飛べる。`preview_screenshot` で確認。

- [ ] **Step 4: コミット**

```bash
git add frontend/app/components/forest/PastDreamsList.tsx frontend/app/forest/[profileId]/page.tsx
git commit -m "feat: プロフィール別の夢の木ページと昔の夢リストを追加"
```

---

## Phase 6: モルペウス案内人

### Task 9: ForestGuide

**Files:**
- Create: `frontend/app/components/forest/ForestGuide.tsx`

- [ ] **Step 1: ForestGuide を作る**

ホームの `MorpheusAssistant.tsx`（framer-motion の吹き出し＋閉じる）を踏襲。`MorpheusImage` を再利用。

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { X } from "lucide-react";
import MorpheusImage from "@/app/components/MorpheusImage";
import { getGrowthLevel } from "@/lib/forest";
import type { DreamProfile } from "@/app/types";

type Props =
  | { variant: "forest"; profiles: DreamProfile[] }
  | { variant: "tree"; profile: DreamProfile; dreamCount: number };

function buildMessage(props: Props): { title: string; body: string } {
  if (props.variant === "forest") {
    const empty = props.profiles.find((p) => (p.dreams_count ?? 0) === 0);
    if (empty) {
      return {
        title: "ゆめの もり へ ようこそ",
        body: `${empty.name}の きは まだ めを だした ばかり。ゆめを かいて そだてよう。`,
      };
    }
    return {
      title: "ゆめの もり へ ようこそ",
      body: "きを たっぷ すると、そのこの ゆめの きを ゆっくり みられるよ。",
    };
  }
  const { name } = getGrowthLevel(props.dreamCount);
  return {
    title: `${props.profile.name}の き`,
    body:
      props.dreamCount === 0
        ? "まだ みが ないね。ゆめを かいて さいしょの みを ならせよう。"
        : `いまは「${name}」まで そだったよ。この ちょうしで つづけよう！`,
  };
}

export default function ForestGuide(props: Props) {
  const [open, setOpen] = useState(true);
  const { title, body } = buildMessage(props);
  const variantImg = props.variant === "forest" ? "home" : "praise";

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-end gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.9 }}
            className="relative mb-2 max-w-[220px] rounded-2xl bg-card text-card-foreground shadow-xl border border-border/50 p-3"
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute -top-2 -right-2 rounded-full bg-muted p-1 text-muted-foreground"
              aria-label="とじる"
            >
              <X className="h-3 w-3" />
            </button>
            <p className="text-sm font-bold">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
            <Link
              href="/home"
              className="mt-2 inline-block rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
            >
              ゆめを かく
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
      <button onClick={() => setOpen((v) => !v)} aria-label="モルペウスと はなす">
        <div className="h-16 w-16 overflow-hidden rounded-full ring-2 ring-primary/40 shadow-lg">
          <MorpheusImage variant={variantImg} className="h-full w-full object-cover" />
        </div>
      </button>
    </div>
  );
}
```

> `MorpheusImage` の props は `frontend/app/components/MorpheusImage.tsx` を確認し、`variant` と `className`（または `width/height`）の正しい受け渡し方に合わせる。`/home` への「ゆめを かく」は、既存の夢作成導線（`DreamEntryLauncher` の遷移先）に合わせてもよい。

- [ ] **Step 2: forest/page.tsx と forest/[profileId]/page.tsx のコメントアウトを戻す**

Task 6 でコメントアウトしていれば、`ForestGuide` の import と JSX を有効化する。

- [ ] **Step 3: 動作確認（dev server）**

Run: `/forest` と `/forest/[id]` の右下にモルペウスが出て、吹き出しに状況メッセージとナビが出る。閉じる→アイコンで再表示。`preview_screenshot` で確認。

- [ ] **Step 4: コミット**

```bash
git add frontend/app/components/forest/ForestGuide.tsx frontend/app/forest/page.tsx frontend/app/forest/[profileId]/page.tsx
git commit -m "feat: 夢の森にモルペウス案内人を追加"
```

---

## Phase 7: 保存直後のお祝い演出

### Task 10: HarvestCelebration と DreamForm 連携

**Files:**
- Create: `frontend/app/components/forest/HarvestCelebration.tsx`
- Modify: `frontend/app/components/DreamForm.tsx`

- [ ] **Step 1: HarvestCelebration を作る**

`frontend/app/components/forest/HarvestCelebration.tsx`:

```tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import MorpheusImage from "@/app/components/MorpheusImage";

const SPARKS = Array.from({ length: 14 }, (_, i) => ({
  angle: (i / 14) * Math.PI * 2,
  delay: (i % 5) * 0.04,
}));

export default function HarvestCelebration({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative rounded-3xl bg-card p-6 text-center shadow-2xl"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弾ける光 */}
            <div className="relative mx-auto mb-3 h-20 w-20">
              {SPARKS.map((s, i) => (
                <motion.span
                  key={i}
                  className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-amber-300"
                  initial={{ x: 0, y: 0, opacity: 1 }}
                  animate={{
                    x: Math.cos(s.angle) * 60,
                    y: Math.sin(s.angle) * 60,
                    opacity: 0,
                  }}
                  transition={{ duration: 0.9, delay: s.delay, ease: "easeOut" }}
                />
              ))}
              <div className="absolute inset-0 m-auto h-12 w-12 overflow-hidden rounded-full">
                <MorpheusImage variant="praise" className="h-full w-full object-cover" />
              </div>
            </div>
            <p className="text-lg font-bold">みが なったよ！🌳</p>
            <p className="mt-1 text-sm text-muted-foreground">
              あたらしい ゆめが きに みのったよ。
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl bg-muted px-4 py-2 text-sm font-bold text-muted-foreground"
              >
                とじる
              </button>
              <Link
                href="/forest"
                className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
              >
                もりを みる
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: DreamForm の保存成功に組み込む**

`frontend/app/components/DreamForm.tsx` を開き、保存成功のハンドラ（`createDream`/`updateDream` 成功後）を確認する。**新規作成が成功したときだけ**お祝いを出す。

1. 先頭付近に state と import を追加:

```tsx
import HarvestCelebration from "@/app/components/forest/HarvestCelebration";
// ...
const [celebrate, setCelebrate] = useState(false);
```

2. 新規作成成功（編集ではない、`initialData` が無いパス）の直後に `setCelebrate(true)` を呼ぶ。既存の遷移（`router.push`）がある場合は、お祝いを見せてから遷移するため、即時遷移をやめてモーダルの「とじる/もりを みる」に委ねるか、`setCelebrate(true)` 後に遷移を遅延させる。最小実装としては、成功トースト直後に `setCelebrate(true)` を追加。

3. JSX 末尾（フォームの外側 fragment 内）に追加:

```tsx
<HarvestCelebration open={celebrate} onClose={() => setCelebrate(false)} />
```

> DreamForm の実際の保存ハンドラ名・新規/編集の分岐は `grep -n "createDream\|initialData\|router.push\|toast.success" frontend/app/components/DreamForm.tsx` で確認してから差し込む。編集時には出さないこと。

- [ ] **Step 3: 動作確認（dev server）**

Run: 夢を新規作成 → 「みが なったよ！」モーダルが弾ける光とモルペウスで表示 → 「もりを みる」で `/forest` へ。編集では出ないこと。`preview_screenshot` で確認。

- [ ] **Step 4: コミット**

```bash
git add frontend/app/components/forest/HarvestCelebration.tsx frontend/app/components/DreamForm.tsx
git commit -m "feat: 夢の保存時にお祝い演出を追加"
```

---

## Phase 8: E2E と仕上げ

### Task 11: Playwright E2E（森→木→夢詳細）

**Files:**
- Create: `frontend/e2e/forest-flow.spec.ts`

- [ ] **Step 1: 既存 E2E のログイン/セットアップ手順を確認**

Run: `sed -n '1,40p' frontend/e2e/home-flow.spec.ts`
既存のログインヘルパ・`baseURL`・data-testid の流儀を踏襲する。

- [ ] **Step 2: テストを書く**

`frontend/e2e/forest-flow.spec.ts`（既存 home-flow のログイン手順に合わせて `beforeEach` を調整）:

```ts
import { test, expect } from "@playwright/test";

// 既存 home-flow.spec.ts のログインユーティリティに合わせること
test.describe("夢の森", () => {
  test("森 → 木 → 夢詳細 へ遷移できる", async ({ page }) => {
    // TODO: home-flow.spec.ts と同じログイン処理をここに置く
    await page.goto("/forest");

    await expect(page.getByRole("heading", { name: "ゆめの もり" })).toBeVisible();

    // 「自分」の木をクリック（aria-label の前方一致で絞り込み）
    await page.getByRole("button", { name: /自分 の木/ }).first().click();

    await expect(page).toHaveURL(/\/forest\/\d+/);
    await expect(page.getByRole("heading", { name: /の き$/ })).toBeVisible();
  });
});
```

> コピー（「ゆめの もり」等）を後で変える場合は、この E2E も同じ PR で直す（プロジェクト方針）。重複テキストは `locator().filter()` で絞る。

- [ ] **Step 3: E2E を実行**

Run: `cd frontend && npx playwright test forest-flow.spec.ts`
Expected: PASS（ログイン手順を正しく埋めた前提）

- [ ] **Step 4: コミット**

```bash
git add frontend/e2e/forest-flow.spec.ts
git commit -m "test: 夢の森の導線E2Eを追加"
```

### Task 12: 最終確認（lint・型・全テスト）

- [ ] **Step 1: フロント型・lint・テスト**

Run:
```bash
cd frontend && npx tsc --noEmit && npm run lint && npx jest
```
Expected: すべて PASS

- [ ] **Step 2: バックテスト**

Run: `cd backend && bundle exec rspec spec/requests/dream_profiles_spec.rb`
Expected: PASS

- [ ] **Step 3: prefers-reduced-motion 確認**

Run: dev server で OS の「視差効果を減らす」をオンにし、`/forest` でアニメが控えめ/停止になることを確認（必要なら各 motion に `useReducedMotion()` を足す）。

> framer-motion の `useReducedMotion()` を ForestScene/MiniTree/DreamFruit/DreamTree で参照し、true のとき `animate` を静的値にするガードを入れる。これは Task 5/7 の実装時に各コンポーネントへ入れてもよい。

---

## Self-Review メモ（仕様カバレッジ）

- 森ビュー（C 案）→ Task 5,6 ✅
- 1本の木・最近の実タップ・育ちレベル → Task 7,8 ✅
- 昔の夢リスト → Task 8 ✅
- リッチ演出（星空・ゆらめき・グロー・お祝いの光）→ Task 5,7,10 ✅／ズーム遷移は MiniTree の whileTap + ページ遷移で簡易表現（必要なら後追いで shared layout 化）
- モルペウス案内＋ナビ → Task 9 ✅
- お祝い → Task 10 ✅
- dreams_count（唯一のバック変更）→ Task 1 ✅
- 純粋関数テスト・request spec・E2E → Task 2,1,11 ✅
- v1除外（シェアカード・archived の木・感情の枝分かれ）→ 計画に含めず ✅
