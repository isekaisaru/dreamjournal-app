"use client";

import Image from "next/image";
import { Dream } from "@/app/types";
import { getChildFriendlyEmotionLabel } from "./EmotionTag";

interface DreamStatsWidgetProps {
  dreams: Dream[];
}

/**
 * 今月の感情タグ分布と今週のサマリーを表示するウィジェット
 * ホームページのサイドバーに配置
 */
export default function DreamStatsWidget({ dreams }: DreamStatsWidgetProps) {
  if (dreams.length === 0) return null;

  const now = new Date();

  // 今月の夢
  const thisMonthDreams = dreams.filter((d) => {
    const date = new Date(d.created_at);
    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  });

  // 今週の夢（直近7日）
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisWeekDreams = dreams.filter(
    (d) => new Date(d.created_at) >= weekAgo
  );

  // 今月の感情タグカウント
  const monthEmotionCounts: Record<string, number> = {};
  thisMonthDreams.forEach((dream) => {
    const tags =
      dream.analysis_json?.emotion_tags ??
      dream.emotions?.map((e) => e.name) ??
      [];
    tags.forEach((tag) => {
      const label = getChildFriendlyEmotionLabel(tag);
      monthEmotionCounts[label] = (monthEmotionCounts[label] ?? 0) + 1;
    });
  });

  const sortedEmotions = Object.entries(monthEmotionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // 今週のトップ感情
  const weekEmotionCounts: Record<string, number> = {};
  thisWeekDreams.forEach((dream) => {
    const tags =
      dream.analysis_json?.emotion_tags ??
      dream.emotions?.map((e) => e.name) ??
      [];
    tags.forEach((tag) => {
      const label = getChildFriendlyEmotionLabel(tag);
      weekEmotionCounts[label] = (weekEmotionCounts[label] ?? 0) + 1;
    });
  });
  const weekTop = Object.entries(weekEmotionCounts).sort(
    ([, a], [, b]) => b - a
  )[0];

  if (sortedEmotions.length === 0) return null;

  const maxCount = sortedEmotions[0][1];

  return (
    <div className="bg-card border border-border rounded-xl p-4 w-full mb-4">
      <h3 className="font-bold text-card-foreground mb-3 flex items-center gap-2">
        <span>📊</span>
        <span>今月の きもち</span>
      </h3>

      {/* 感情タグ棒グラフ */}
      <div className="space-y-2 mb-4">
        {sortedEmotions.map(([label, count]) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-xs w-20 text-right text-muted-foreground shrink-0 truncate">
              {label}
            </span>
            <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-700"
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-5 text-right">
              {count}
            </span>
          </div>
        ))}
      </div>

      {/* モルペウスの今週サマリー */}
      {weekTop && (
        <div className="flex items-center gap-2 bg-slate-800/60 dark:bg-slate-800/60 bg-slate-100 rounded-xl p-3 border border-slate-700/40 dark:border-slate-700/40 border-slate-200">
          <Image
            src="/images/morpheus.png"
            alt="モルペウス"
            width={36}
            height={36}
            className="opacity-90 shrink-0"
          />
          <p className="text-xs leading-relaxed text-slate-200 dark:text-slate-200 text-slate-700">
            今週いちばん多い きもちは{" "}
            <span className="font-bold text-sky-300 dark:text-sky-300 text-sky-600">
              「{weekTop[0]}」
            </span>{" "}
            だったよ！
          </p>
        </div>
      )}
    </div>
  );
}
