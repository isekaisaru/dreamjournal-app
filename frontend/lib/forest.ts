import type { Dream } from "@/app/types";

/** 1本の木にタップ可能な「実」として表示する最近の夢の数 */
export const RECENT_FRUIT_COUNT = 12;

export interface GrowthLevel {
  level: number;
  name: string;
  reading: string;
  emoji: string;
}

const LEVELS: { min: number; level: GrowthLevel }[] = [
  { min: 60, level: { level: 5, name: "古木", reading: "こぼく", emoji: "🌲" } },
  { min: 30, level: { level: 4, name: "大樹", reading: "たいじゅ", emoji: "🌳" } },
  { min: 15, level: { level: 3, name: "木", reading: "き", emoji: "🌳" } },
  { min: 5,  level: { level: 2, name: "若木", reading: "わかぎ", emoji: "🌿" } },
  { min: 1,  level: { level: 1, name: "苗", reading: "なえ", emoji: "🌱" } },
  { min: 0,  level: { level: 0, name: "芽", reading: "め", emoji: "🌱" } },
];

export function getGrowthLevel(count: number): GrowthLevel {
  return (LEVELS.find((l) => count >= l.min) ?? LEVELS[LEVELS.length - 1]).level;
}

/** 次のレベルまでの進捗情報 */
export function nextLevelInfo(count: number) {
  const order = [0, 1, 5, 15, 30, 60];
  const cur = getGrowthLevel(count);
  const nextMin = order[cur.level + 1];
  if (nextMin == null) return { atMax: true, into: 0, span: 1, remaining: 0, pct: 100 };
  const curMin = order[cur.level];
  const into = count - curMin;
  const span = nextMin - curMin;
  return { atMax: false, into, span, remaining: nextMin - count, pct: Math.round((into / span) * 100) };
}

export function getCanopyScale(level: number): number {
  const table = [0.5, 0.66, 0.82, 1.0, 1.22, 1.45];
  return table[Math.max(0, Math.min(level, table.length - 1))];
}

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

export interface FruitPos { xPct: number; yPct: number; wobble: number; }

export function fruitPosition(dreamId: number, index: number): FruitPos {
  const rand = seededRandom(dreamId * 97 + index * 31 + 7);
  const angle = rand() * Math.PI * 2;
  const radius = 0.32 + rand() * 0.5;
  const xPct = 50 + Math.cos(angle) * radius * 46;
  const yPct = 44 + Math.sin(angle) * radius * 40;
  return { xPct: Math.max(4, Math.min(96, xPct)), yPct: Math.max(6, Math.min(92, yPct)), wobble: rand() };
}

export const EMOTION_COLORS: Record<string, string> = {
  喜び: "#fbbf24", 楽しい: "#f59e0b", 幸せ: "#fb7185", 愛: "#ec4899",
  安心: "#34d399", 期待: "#22d3ee", 驚き: "#a78bfa", 悲しい: "#60a5fa",
  不安: "#818cf8", 怒り: "#f87171", 恐怖: "#9333ea", 混乱: "#94a3b8",
};

export function fruitColor(dream: Pick<Dream, "id" | "emotions">, profileColor: string): string {
  const first = dream.emotions?.[0]?.name;
  if (first && EMOTION_COLORS[first]) return EMOTION_COLORS[first];
  return profileColor;
}
