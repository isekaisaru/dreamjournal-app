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

export function fruitColor(
  dream: Pick<Dream, "id" | "emotions">,
  profileColor: string
): string {
  const first = dream.emotions?.[0]?.name;
  if (first && EMOTION_COLORS[first]) return EMOTION_COLORS[first];
  return profileColor;
}
