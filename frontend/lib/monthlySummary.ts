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

  const highlights = [
    `${dreamCount}この ゆめ`,
    `${recordedDays}にち きろく`,
    `${analyzedCount}こ ぶんせきずみ`,
  ];

  let message = `${fallbackMonthLabel}は ${dreamCount}この ゆめを きろくしたよ。`;
  if (topEmotions[0]) {
    message += ` いちばん多かった きもちは「${topEmotions[0].label}」だったよ。`;
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
