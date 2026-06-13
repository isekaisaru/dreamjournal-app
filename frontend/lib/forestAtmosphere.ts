// forestAtmosphere.ts — 夢の森の時刻・季節による雰囲気を決める純粋関数群。
// nextLevelInfo / HAZE を追加。既存の getTimePhase, getSeason, getSkyGradient,
// getCelestial はそのまま維持。

export type TimePhase = "dawn" | "day" | "dusk" | "night";
export type Season = "spring" | "summer" | "autumn" | "winter";

export function getTimePhase(date: Date): TimePhase {
  const h = date.getHours();
  if (h >= 5 && h <= 9)  return "dawn";
  if (h >= 10 && h <= 15) return "day";
  if (h >= 16 && h <= 18) return "dusk";
  return "night";
}

export function getSeason(date: Date): Season {
  const m = date.getMonth() + 1;
  if (m >= 3 && m <= 5)  return "spring";
  if (m >= 6 && m <= 8)  return "summer";
  if (m >= 9 && m <= 11) return "autumn";
  return "winter";
}

const SKY_GRADIENTS: Record<TimePhase, string> = {
  dawn:  "linear-gradient(180deg, #3a2f5e 0%, #2a2150 55%, #181030 100%)",
  day:   "linear-gradient(180deg, #25425e 0%, #1d3850 55%, #122535 100%)",
  dusk:  "linear-gradient(180deg, #4a2a55 0%, #3a2048 55%, #1f1230 100%)",
  night: "linear-gradient(180deg, #241a40 0%, #1a1336 55%, #0e0a1c 100%)",
};

export function getSkyGradient(phase: TimePhase): string {
  return SKY_GRADIENTS[phase];
}

export interface Celestial {
  moonXPct: number;
  moonYPct: number;
  starOpacity: number;
  glow: string;
}

const CELESTIAL: Record<TimePhase, Celestial> = {
  dawn:  { moonXPct: 18, moonYPct: 26, starOpacity: 0.4,  glow: "#fde68a" },
  day:   { moonXPct: 50, moonYPct: 14, starOpacity: 0.12, glow: "#fef3c7" },
  dusk:  { moonXPct: 82, moonYPct: 22, starOpacity: 0.55, glow: "#fdba74" },
  night: { moonXPct: 60, moonYPct: 12, starOpacity: 1.0,  glow: "#fef3c7" },
};

export function getCelestial(phase: TimePhase): Celestial {
  return CELESTIAL[phase];
}

/** 地面の霞グラデーション（CSS rgba 文字列）— 時間帯で色相が変わる */
export const HAZE: Record<TimePhase, string> = {
  dawn:  "rgba(120,80,170,0.40)",
  day:   "rgba(60,110,150,0.34)",
  dusk:  "rgba(150,70,120,0.42)",
  night: "rgba(70,45,150,0.40)",
};
