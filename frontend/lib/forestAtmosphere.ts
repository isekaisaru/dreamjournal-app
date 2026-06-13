// 夢の森の「時刻」と「季節」による雰囲気を決める純粋関数群。
// すべて入力 Date → 出力が決定的。new Date() は呼び出し側で生成して渡す（テスト容易性）。

export type TimePhase = "dawn" | "day" | "dusk" | "night";
export type Season = "spring" | "summer" | "autumn" | "winter";

/** 時刻 → 時間帯。朝5-9 / 昼10-15 / 夕16-18 / それ以外は夜。 */
export function getTimePhase(date: Date): TimePhase {
  const h = date.getHours();
  if (h >= 5 && h <= 9) return "dawn";
  if (h >= 10 && h <= 15) return "day";
  if (h >= 16 && h <= 18) return "dusk";
  return "night";
}

/** 月 → 季節（北半球・日本）。春3-5 / 夏6-8 / 秋9-11 / 冬12,1,2。 */
export function getSeason(date: Date): Season {
  const m = date.getMonth() + 1; // 1-12
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "autumn";
  return "winter";
}

// 方向B「ずっと幻想的」: 常に暗めの夢トーンを保ち、時刻で色相だけ寄せる。
// 夜は A+B で確定済みの紺をそのまま使う。
const SKY_GRADIENTS: Record<TimePhase, string> = {
  // 朝＝薄紫
  dawn: "linear-gradient(180deg, #3a2f5e 0%, #2a2150 55%, #181030 100%)",
  // 昼＝青緑
  day: "linear-gradient(180deg, #25425e 0%, #1d3850 55%, #122535 100%)",
  // 夕＝赤紫
  dusk: "linear-gradient(180deg, #4a2a55 0%, #3a2048 55%, #1f1230 100%)",
  // 夜＝紺（現状維持）
  night: "linear-gradient(180deg, #241a40 0%, #1a1336 55%, #0e0a1c 100%)",
};

/** 時間帯 → 空グラデーション（CSS linear-gradient 文字列）。 */
export function getSkyGradient(phase: TimePhase): string {
  return SKY_GRADIENTS[phase];
}

export interface Celestial {
  moonXPct: number; // 月の左位置（%）
  moonYPct: number; // 月の上位置（%）
  starOpacity: number; // 星全体の濃さ（0〜1の基準値）
}

// 月の位置・星の濃さを時間帯で変える。読込時の静的値なので reduced-motion でも安全。
// 月は夜に空を弧で移動するイメージ: 夕方=右下→夜=高く中央寄り→朝=左へ沈む。
const CELESTIAL: Record<TimePhase, Celestial> = {
  dawn: { moonXPct: 18, moonYPct: 26, starOpacity: 0.35 },
  day: { moonXPct: 50, moonYPct: 14, starOpacity: 0.12 },
  dusk: { moonXPct: 82, moonYPct: 22, starOpacity: 0.5 },
  night: { moonXPct: 60, moonYPct: 12, starOpacity: 1 },
};

/** 時間帯 → 月の位置と星の濃さ。 */
export function getCelestial(phase: TimePhase): Celestial {
  return CELESTIAL[phase];
}
