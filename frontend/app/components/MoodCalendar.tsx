"use client";

/**
 * MoodCalendar — 月のムードヒートマップ（GitHubの草グラフ風）
 *
 * その月、どんな気持ちの夢が多かったかを一目で振り返れるカレンダー。
 * 各日のセルを「その日の最頻感情の色」で塗る。
 *
 * 既存資産を再利用:
 *  - getChildFriendlyEmotionLabel（EmotionTag.tsx）で感情ラベルを正規化
 *  - getJSTYearMonthKey（lib/date.ts）でJST基準の月キーを生成
 *
 * 使い方:
 *  <MoodCalendar dreams={dreams} month={getJSTYearMonthKey(new Date())} />
 */

import { useMemo } from "react";

import { Dream } from "@/app/types";
import { getJSTYearMonthKey } from "@/lib/date";
import { getChildFriendlyEmotionLabel } from "./EmotionTag";

// 感情カテゴリ → セル色（Tailwind）。EmotionTag のカテゴリと対応。
function emotionToCellClass(label: string): string {
  if (label.includes("うれしい")) return "bg-orange-400";
  if (label.includes("たのしい")) return "bg-amber-400";
  if (label.includes("じーんとした")) return "bg-rose-400";
  if (label.includes("おこってる")) return "bg-red-500";
  if (label.includes("こわい")) return "bg-violet-500";
  if (label.includes("しんぱい")) return "bg-indigo-400";
  if (label.includes("かなしい")) return "bg-sky-400";
  if (label.includes("ほっとした")) return "bg-emerald-400";
  if (label.includes("びっくり")) return "bg-yellow-400";
  if (label.includes("わからない")) return "bg-slate-400";
  return "bg-sky-300";
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

type DayCell = {
  date: number | null; // null = 前月の空きマス
  iso?: string;
  cellClass: string; // 色（記録なしは muted）
  label?: string; // ツールチップ用の代表感情
  count?: number;
};

type MoodCalendarProps = {
  dreams: Dream[];
  /** "2026-06" 形式。省略時は今月（JST） */
  month?: string;
};

export default function MoodCalendar({ dreams, month }: MoodCalendarProps) {
  const ym = month ?? getJSTYearMonthKey(new Date());
  const [year, mon] = ym.split("-").map(Number);

  const cells = useMemo<DayCell[]>(() => {
    // 日付ごとに感情を集計
    const byDay = new Map<string, Map<string, number>>();
    for (const d of dreams) {
      if (!d.created_at || getJSTYearMonthKey(d.created_at) !== ym) continue;
      const day = new Date(d.created_at).toLocaleDateString("en-CA", {
        timeZone: "Asia/Tokyo",
      }); // YYYY-MM-DD
      const tags =
        d.analysis_json?.emotion_tags ?? d.emotions?.map((e) => e.name) ?? [];
      const counts = byDay.get(day) ?? new Map<string, number>();
      for (const t of tags) {
        const label = getChildFriendlyEmotionLabel(t);
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
      byDay.set(day, counts);
    }

    const firstWeekday = new Date(year, mon - 1, 1).getDay();
    const daysInMonth = new Date(year, mon, 0).getDate();

    const out: DayCell[] = [];
    // 月初までの空きマス
    for (let i = 0; i < firstWeekday; i++) {
      out.push({ date: null, cellClass: "bg-transparent" });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const iso = `${ym}-${String(day).padStart(2, "0")}`;
      const counts = byDay.get(iso);
      if (!counts || counts.size === 0) {
        out.push({ date: day, iso, cellClass: "bg-muted" });
        continue;
      }
      // その日の最頻感情
      let topLabel = "";
      let topCount = 0;
      let total = 0;
      for (const [label, c] of counts) {
        total += c;
        if (c > topCount) {
          topCount = c;
          topLabel = label;
        }
      }
      out.push({
        date: day,
        iso,
        cellClass: emotionToCellClass(topLabel),
        label: topLabel,
        count: total,
      });
    }
    return out;
  }, [dreams, ym, year, mon]);

  return (
    <section className="w-full rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 font-bold text-card-foreground">
        <span aria-hidden="true">🗓️</span>
        <span>ムードカレンダー</span>
      </h3>

      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-[10px] font-medium text-muted-foreground">
            {w}
          </div>
        ))}
        {cells.map((cell, i) => (
          <div
            key={cell.iso ?? `empty-${i}`}
            title={
              cell.date && cell.label
                ? `${mon}/${cell.date} ${cell.label}（${cell.count}件）`
                : cell.date
                  ? `${mon}/${cell.date} 記録なし`
                  : undefined
            }
            className={`aspect-square rounded-[6px] ${cell.cellClass} ${
              cell.date ? "ring-1 ring-inset ring-black/[0.03]" : ""
            }`}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {[
          ["うれしい系", "bg-orange-400"],
          ["たのしい系", "bg-amber-400"],
          ["かなしい系", "bg-sky-400"],
          ["ふしぎ系", "bg-violet-500"],
          ["記録なし", "bg-muted"],
        ].map(([label, cls]) => (
          <span
            key={label}
            className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground"
          >
            <span className={`h-2.5 w-2.5 rounded-[3px] ${cls}`} />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}
