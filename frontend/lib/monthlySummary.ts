import { Dream } from "@/app/types";
import { getChildFriendlyEmotionLabel } from "@/app/components/EmotionTag";
import { getJSTDateStr } from "@/lib/date";

export type MonthlySummary = {
  dreamCount: number;
  recordedDays: number;
  analyzedCount: number;
  topEmotions: Array<{ label: string; count: number }>;
  highlights: string[];
  message: string;
};

function extractEmotionLabels(dream: Dream): string[] {
  const rawLabels =
    dream.analysis_json?.emotion_tags && dream.analysis_json.emotion_tags.length > 0
      ? dream.analysis_json.emotion_tags
      : dream.emotions?.map((emotion) => emotion.name) ?? [];

  return Array.from(new Set(rawLabels.map(getChildFriendlyEmotionLabel)));
}

export function buildMonthlySummary(
  dreams: Dream[],
  fallbackMonthLabel: string
): MonthlySummary {
  const dreamCount = dreams.length;
  const recordedDays = new Set(dreams.map((dream) => getJSTDateStr(dream.created_at)))
    .size;
  const analyzedCount = dreams.filter(
    (dream) =>
      dream.analysis_status === "done" ||
      Boolean(dream.analysis_json?.analysis || dream.analysis_json?.text)
  ).length;

  const emotionCounts: Record<string, number> = {};
  dreams.forEach((dream) => {
    extractEmotionLabels(dream).forEach((label) => {
      emotionCounts[label] = (emotionCounts[label] ?? 0) + 1;
    });
  });

  const topEmotions = Object.entries(emotionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([label, count]) => ({ label, count }));

  // 同率1位をすべて拾う（メッセージで「と」つなぎにするため）
  const maxCount = Math.max(0, ...Object.values(emotionCounts));
  const topTiedLabels = Object.entries(emotionCounts)
    .filter(([, count]) => count === maxCount)
    .map(([label]) => label);

  const highlights = [
    `${dreamCount}この ゆめ`,
    `${recordedDays}にち きろく`,
    `${analyzedCount}こ ぶんせきずみ`,
  ];

  let message = `${fallbackMonthLabel}は ${dreamCount}この ゆめを きろくしたよ。`;
  if (topTiedLabels.length > 0) {
    // 多すぎると読みにくいので3つまで表示し、残りは「など」でまとめる
    const TIE_DISPLAY_LIMIT = 3;
    const shown = topTiedLabels.slice(0, TIE_DISPLAY_LIMIT);
    const joined = shown.map((label) => `「${label}」`).join("と");
    const suffix = topTiedLabels.length > TIE_DISPLAY_LIMIT ? "など" : "";
    message += ` いちばん多かった きもちは${joined}${suffix}だったよ。`;
  } else if (dreamCount > 0) {
    message += " これから きもちタグが ふえると、もっと たのしく ふりかえれるよ。";
  }

  return {
    dreamCount,
    recordedDays,
    analyzedCount,
    topEmotions,
    highlights,
    message,
  };
}
