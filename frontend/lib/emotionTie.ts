// 感情タグの集計から「同率1位」を扱う共通ヘルパー。
// 月間ふりかえり(monthlySummary)と今週サマリー(DreamStatsWidget)で共有する。

const TIE_DISPLAY_LIMIT = 3;

/**
 * 件数マップから最も多い感情ラベルをすべて返す（同率1位を取りこぼさない）。
 * 感情が1つも無いときは空配列を返す。
 */
export function pickTopEmotionLabels(
  counts: Record<string, number>
): string[] {
  const maxCount = Math.max(0, ...Object.values(counts));
  if (maxCount <= 0) return [];
  return Object.entries(counts)
    .filter(([, count]) => count === maxCount)
    .map(([label]) => label);
}

/**
 * 同率1位ラベルを「「A」と「B」」の形に整形する。
 * 読みやすさのため既定で3つまで表示し、超過分は「など」でまとめる。
 */
export function formatTopEmotionLabels(
  labels: string[],
  limit: number = TIE_DISPLAY_LIMIT
): string {
  if (labels.length === 0) return "";
  const joined = labels
    .slice(0, limit)
    .map((label) => `「${label}」`)
    .join("と");
  const suffix = labels.length > limit ? "など" : "";
  return `${joined}${suffix}`;
}
