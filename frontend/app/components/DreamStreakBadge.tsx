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
  ).sort().reverse();

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
      const diffDays = Math.round(
        (prev.getTime() - curr.getTime()) / 86400000
      );
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

  // 獲得バッジの計算
  const badges: { icon: string; label: string; color: string }[] = [];
  if (current >= 3)
    badges.push({
      icon: "🔥",
      label: `${current}日れんぞく！`,
      color: "text-orange-400 border-orange-400/40 bg-orange-400/10",
    });
  if (current >= 7)
    badges.push({
      icon: "⭐",
      label: "1しゅうかん！",
      color: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
    });
  if (current >= 30)
    badges.push({
      icon: "🏆",
      label: "1ヶ月かいたよ！",
      color: "text-sky-400 border-sky-400/40 bg-sky-400/10",
    });
  if (thisMonthCount >= 10)
    badges.push({
      icon: "🌟",
      label: `今月${thisMonthCount}かい！`,
      color: "text-purple-400 border-purple-400/40 bg-purple-400/10",
    });
  if (longest >= 7 && current < longest)
    badges.push({
      icon: "🎯",
      label: `さいこう${longest}にち`,
      color: "text-emerald-400 border-emerald-400/40 bg-emerald-400/10",
    });

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

      {/* バッジ表示 */}
      {badges.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {badges.map((badge, i) => (
            <div
              key={i}
              className={`flex items-center gap-1 border rounded-full px-3 py-1 text-xs font-bold ${badge.color}`}
            >
              <span>{badge.icon}</span>
              <span>{badge.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {current === 0
            ? "きょうも ゆめを かいてみよう！🌙"
            : `あと ${3 - current} にち れんぞくで バッジ がもらえるよ！`}
        </p>
      )}
    </div>
  );
}
