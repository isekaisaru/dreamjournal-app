"use client";

import { Dream } from "@/app/types";
import { getJSTDateStr, getJSTYearMonthKey } from "@/lib/date";

interface DreamStreakBadgeProps {
  dreams: Dream[];
}

/** 連続記録日数を計算 */
function calcStreak(dreams: Dream[]): { current: number; longest: number } {
  if (dreams.length === 0) return { current: 0, longest: 0 };

  // ユニークな日付を降順に並べる
  const uniqueDays = Array.from(
    new Set(dreams.map((d) => getJSTDateStr(d.created_at)))
  )
    .sort()
    .reverse();

  const todayStr = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Tokyo",
  });
  const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString(
    "en-CA",
    { timeZone: "Asia/Tokyo" }
  );

  // 現在の連続記録（今日 or 昨日から始まる）
  let current = 0;
  if (uniqueDays[0] === todayStr || uniqueDays[0] === yesterdayStr) {
    current = 1;
    for (let i = 1; i < uniqueDays.length; i++) {
      const prev = new Date(uniqueDays[i - 1]);
      const curr = new Date(uniqueDays[i]);
      const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
      if (diffDays === 1) {
        current++;
      } else {
        break;
      }
    }
  }

  // 最長連続記録
  let longest = uniqueDays.length > 0 ? 1 : 0;
  let temp = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1]);
    const curr = new Date(uniqueDays[i]);
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
    if (diffDays === 1) {
      temp++;
      if (temp > longest) longest = temp;
    } else {
      temp = 1;
    }
  }

  return { current, longest };
}

/**
 * 夢日記の連続記録バッジコンポーネント
 * ストリーク・月間カウント・バッジを表示
 */
export default function DreamStreakBadge({ dreams }: DreamStreakBadgeProps) {
  if (dreams.length === 0) return null;

  const { current, longest } = calcStreak(dreams);

  // 今月のカウント
  const currentJSTMonth = getJSTYearMonthKey(new Date());
  const thisMonthCount = dreams.filter((d) => {
    return getJSTYearMonthKey(d.created_at) === currentJSTMonth;
  }).length;

  const milestone =
    current === 30
      ? {
          icon: "🏆",
          title: "1ヶ月つづいた！",
          body: "きょうは とくべつ。たくさん つづけて かけたね。",
          tone: "border-sky-400/40 bg-sky-400/10 text-sky-500",
        }
      : current === 7
        ? {
            icon: "⭐",
            title: "1しゅうかん たっせい！",
            body: "れんぞくで かけたよ。すごいペース！",
            tone: "border-yellow-400/40 bg-yellow-400/10 text-yellow-500",
          }
        : current === 3
          ? {
              icon: "🔥",
              title: "3日れんぞく！",
              body: "このリズム、いいかんじ。そのまま つづけよう。",
              tone: "border-orange-400/40 bg-orange-400/10 text-orange-500",
            }
          : null;

  const nextMilestone =
    current < 3 ? 3 : current < 7 ? 7 : current < 30 ? 30 : null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 w-full mb-4">
      <h3 className="font-bold text-card-foreground mb-3 flex items-center gap-2">
        <span>🏅</span>
        <span>きろく</span>
      </h3>

      {/* 統計カウンター */}
      <div className="flex gap-4 text-center mb-3">
        <div className="flex-1">
          <div className="text-2xl font-bold text-primary">{current}</div>
          <div className="text-xs text-muted-foreground">今の れんぞく</div>
        </div>
        <div className="w-px bg-border" />
        <div className="flex-1">
          <div className="text-2xl font-bold text-muted-foreground">
            {longest}
          </div>
          <div className="text-xs text-muted-foreground">さいこう</div>
        </div>
        <div className="w-px bg-border" />
        <div className="flex-1">
          <div className="text-2xl font-bold text-sky-400">
            {thisMonthCount}
          </div>
          <div className="text-xs text-muted-foreground">今月</div>
        </div>
      </div>

      {milestone ? (
        <div
          className={`rounded-2xl border px-4 py-3 shadow-sm transition-colors ${milestone.tone}`}
        >
          <div className="flex items-center gap-2 text-sm font-bold">
            <span>{milestone.icon}</span>
            <span>{milestone.title}</span>
          </div>
          <p className="mt-1 text-xs text-foreground/80">{milestone.body}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {current === 0
              ? "きょうも ゆめを かいてみよう！🌙"
              : nextMilestone
                ? `つぎの おいわいは ${nextMilestone}日れんぞく。あと ${nextMilestone - current} にち！`
                : `さいこう きろくは ${longest}日。いいペースで つづいているよ。`}
          </p>
          {thisMonthCount >= 10 ? (
            <p className="mt-2 text-xs font-medium text-primary">
              今月は もう {thisMonthCount}かい かけているよ。
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
