"use client";

import { motion } from "framer-motion";
import { Sparkles, Trophy } from "lucide-react";

import type { Dream } from "@/app/types";
import { getJSTDateStr, getJSTYearMonthKey } from "@/lib/date";
import MorpheusImage, { type MorpheusImageVariant } from "./MorpheusImage";

type DreamAdventurePanelProps = {
  dreams: Dream[];
};

type Quest = {
  id: string;
  label: string;
  helper: string;
  done: boolean;
  progressLabel: string;
};

function getUniqueDreamDays(dreams: Dream[]) {
  return Array.from(new Set(dreams.map((dream) => getJSTDateStr(dream.created_at))));
}

function calcCurrentStreak(dreams: Dream[]) {
  const uniqueDays = getUniqueDreamDays(dreams).sort().reverse();
  if (uniqueDays.length === 0) return 0;

  const todayStr = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Tokyo",
  });
  const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString(
    "en-CA",
    { timeZone: "Asia/Tokyo" }
  );

  if (uniqueDays[0] !== todayStr && uniqueDays[0] !== yesterdayStr) {
    return 0;
  }

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1]);
    const current = new Date(uniqueDays[i]);
    const diffDays = Math.round((prev.getTime() - current.getTime()) / 86400000);
    if (diffDays !== 1) break;
    streak += 1;
  }

  return streak;
}

function hasEmotionTags(dream: Dream) {
  return Boolean(
    dream.analysis_json?.emotion_tags?.length || dream.emotions?.length
  );
}

function getAdventureTitle(totalDreams: number, completedQuestCount: number) {
  if (totalDreams === 0) return "はじめての夢の地図";
  if (completedQuestCount >= 3) return "今日の夢の冒険、ばっちり！";
  if (completedQuestCount >= 2) return "夢の地図がひかってきたよ";
  return "今日の小さな夢クエスト";
}

function getMorpheusVariant(completedQuestCount: number): MorpheusImageVariant {
  if (completedQuestCount >= 3) return "reward";
  if (completedQuestCount >= 2) return "praise";
  if (completedQuestCount >= 1) return "search";
  return "landing";
}

export default function DreamAdventurePanel({ dreams }: DreamAdventurePanelProps) {
  const todayStr = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Tokyo",
  });
  const currentMonth = getJSTYearMonthKey(new Date());
  const todayDreams = dreams.filter((dream) => getJSTDateStr(dream.created_at) === todayStr);
  const currentMonthDreams = dreams.filter(
    (dream) => getJSTYearMonthKey(dream.created_at) === currentMonth
  );
  const taggedDreamCount = dreams.filter(hasEmotionTags).length;
  const imageDreamCount = dreams.filter((dream) => dream.generated_image_url).length;
  const currentStreak = calcCurrentStreak(dreams);

  const quests: Quest[] = [
    {
      id: "today-dream",
      label: "今日の夢を1つのこす",
      helper: "朝のうちに ひとことでもOK",
      done: todayDreams.length >= 1,
      progressLabel: `${Math.min(todayDreams.length, 1)}/1`,
    },
    {
      id: "emotion-star",
      label: "気持ちの星を3つ集める",
      helper: "感情タグつきの夢が増えると、あとで探しやすいよ",
      done: taggedDreamCount >= 3,
      progressLabel: `${Math.min(taggedDreamCount, 3)}/3`,
    },
    {
      id: "month-map",
      label: "今月の夢マップを5ページにする",
      helper: "今月の夢が増えるほど、月次サマリーが楽しくなるよ",
      done: currentMonthDreams.length >= 5,
      progressLabel: `${Math.min(currentMonthDreams.length, 5)}/5`,
    },
  ];

  const completedQuestCount = quests.filter((quest) => quest.done).length;
  const progress = Math.round((completedQuestCount / quests.length) * 100);
  const title = getAdventureTitle(dreams.length, completedQuestCount);
  const morpheusVariant = getMorpheusVariant(completedQuestCount);
  const hasWindowBadge = imageDreamCount > 0;
  const hasStreakBadge = currentStreak >= 3;
  const hasMonthBadge = currentMonthDreams.length >= 5;

  return (
    <section className="relative mb-4 w-full overflow-hidden rounded-[1.75rem] border border-sky-200/70 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-4 text-slate-900 shadow-md dark:border-sky-500/20 dark:from-slate-900 dark:via-slate-950 dark:to-indigo-950 dark:text-slate-50">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-300/20 blur-2xl" />
      <div className="pointer-events-none absolute bottom-4 left-5 text-xl opacity-50 motion-safe:animate-pulse">
        ✦
      </div>
      <div className="relative flex items-start gap-3">
        <motion.div
          initial={{ scale: 0.92, rotate: -4 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
          className="shrink-0 rounded-2xl bg-white/80 p-1 shadow-sm ring-1 ring-white/60 dark:bg-white/10 dark:ring-white/10"
        >
          <MorpheusImage variant={morpheusVariant} size={78} />
        </motion.div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">
            <Sparkles className="h-3.5 w-3.5" />
            Dream Adventure
          </p>
          <h3 className="mt-1 text-lg font-bold leading-tight">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            がんばらなくて大丈夫。できたぶんだけ、夢の地図が少しずつ光るよ。
          </p>
        </div>
      </div>

      <div className="relative mt-4">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span>今日の冒険</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-sky-300 via-indigo-300 to-amber-200"
          />
        </div>
      </div>

      <ul className="relative mt-4 space-y-2">
        {quests.map((quest, index) => (
          <motion.li
            key={quest.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.28 }}
            className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/70 px-3 py-2.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5"
          >
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
                quest.done
                  ? "bg-amber-200 text-amber-900"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
              }`}
              aria-hidden="true"
            >
              {quest.done ? "★" : index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-snug">{quest.label}</p>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                {quest.helper}
              </p>
            </div>
            <span className="rounded-full bg-slate-900/5 px-2 py-1 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-200">
              {quest.progressLabel}
            </span>
          </motion.li>
        ))}
      </ul>

      <div className="relative mt-4 rounded-2xl border border-white/70 bg-white/60 px-3 py-3 dark:border-white/10 dark:bg-white/5">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold">
          <Trophy className="h-4 w-4 text-amber-500" />
          <span>あつめた夢バッジ</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className={`rounded-2xl px-2 py-3 ${hasStreakBadge ? "bg-amber-100 text-amber-900 dark:bg-amber-300/20 dark:text-amber-100" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
            <div className="text-lg">🌙</div>
            <div className="mt-1 font-bold">3日月</div>
          </div>
          <div className={`rounded-2xl px-2 py-3 ${hasMonthBadge ? "bg-sky-100 text-sky-900 dark:bg-sky-300/20 dark:text-sky-100" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
            <div className="text-lg">🗺️</div>
            <div className="mt-1 font-bold">夢地図</div>
          </div>
          <div className={`rounded-2xl px-2 py-3 ${hasWindowBadge ? "bg-indigo-100 text-indigo-900 dark:bg-indigo-300/20 dark:text-indigo-100" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
            <div className="text-lg">🪟</div>
            <div className="mt-1 font-bold">夢の窓</div>
          </div>
        </div>
      </div>
    </section>
  );
}
