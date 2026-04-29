"use client";

import { Dream } from "@/app/types";
import { getJSTDateStr, getJSTYearMonthKey } from "@/lib/date";
import MorpheusImage, { type MorpheusImageVariant } from "./MorpheusImage";

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

function getMorpheusVariant(current: number): MorpheusImageVariant {
  if (current === 0) return "empty";
  if (current < 3) return "search";
  if (current < 7) return "praise";
  return "reward";
}

/**
 * 夢日記の連続記録バッジコンポーネント
 * ストリーク・月間カウント・バッジを表示
 */
export default function DreamStreakBadge({ dreams }: DreamStreakBadgeProps) {
  if (dreams.length === 0) return null;

  const { current, longest } = calcStreak(dreams);
  const moonProgress = Math.min(current, 30) / 30;
  const morpheusVariant = getMorpheusVariant(current);

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

      <div className="mb-4 flex items-center gap-4 rounded-3xl border border-border/70 bg-muted/25 px-4 py-4">
        <div className="relative h-16 w-16 shrink-0 rounded-full border border-amber-200/70 bg-slate-950/80 shadow-inner">
          <div
            className="absolute inset-y-1 left-1 rounded-full bg-gradient-to-b from-amber-100 via-yellow-200 to-amber-400 transition-all duration-500"
            style={{ width: `${16 + moonProgress * 40}px` }}
          />
          <div className="absolute left-2 top-2 h-1.5 w-1.5 rounded-full bg-white/80 shadow-[18px_6px_0_rgba(255,255,255,0.55)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-card-foreground">
            月がすこしずつ満ちていく
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {current > 0
              ? `いまは ${current}日れんぞく。${current >= 7 ? "モルペウスも ちょっと ほこらしげ。" : "きょうも もうひとつ ふくらむよ。"}`
              : "さいしょの 1こを かくと、月がひかりはじめるよ。"}
          </p>
        </div>
        <div className="hidden sm:block rounded-2xl bg-white/80 p-1 shadow-sm ring-1 ring-sky-100 dark:bg-white/10 dark:ring-white/10">
          <MorpheusImage variant={morpheusVariant} size={76} />
        </div>
      </div>

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
