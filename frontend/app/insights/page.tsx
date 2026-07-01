"use client";

/**
 * きもちインサイト ダッシュボード（redesign-code STEP 5 / 改善④）
 *
 * 今月の夢の振り返りを1ページに集約: KPI / ムードカレンダー(STEP1再利用) /
 * モルペウスの月まとめ / きもちTOP5 / 記録の流れ(半年)。
 * 集計はクライアントで完結（バックエンド変更なし）。
 *
 * 適応: 参照の AppShell は本リポでは未採用（サイドバー先行）のため使わず、
 * グローバルなレイアウトシェル（サイドバー/ヘッダー/ボトムバー）上の通常ページとして配置。
 */

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/apiClient";
import { getJSTYearMonthKey } from "@/lib/date";
import { resolveDreamEmotionNames } from "@/lib/dreamEmotions";
import { getChildFriendlyEmotionLabel } from "@/app/components/EmotionTag";
import MoodCalendar from "@/app/components/MoodCalendar";
import MorpheusAvatar from "@/app/components/MorpheusAvatar";
import MorpheusLoginRequired from "@/app/components/MorpheusLoginRequired";
import Loading from "../loading";
import type { Dream } from "@/app/types";

const POSITIVE = ["うれしい", "たのしい", "ほっとした"];

// 感情→バー色（EmotionTag のカテゴリに対応）
function emotionToBar(label: string): string {
  if (label.includes("うれしい")) return "from-orange-300 to-orange-500";
  if (label.includes("たのしい")) return "from-amber-300 to-amber-500";
  if (label.includes("ほっとした")) return "from-emerald-300 to-emerald-500";
  if (label.includes("しんぱい")) return "from-indigo-300 to-indigo-500";
  if (label.includes("かなしい")) return "from-sky-300 to-blue-500";
  return "from-violet-300 to-violet-500";
}

export default function InsightsPage() {
  const { authStatus, user } = useAuth();
  const [dreams, setDreams] = useState<Dream[]>([]);
  const ym = getJSTYearMonthKey(new Date());

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    apiClient
      .get<Dream[]>("/dreams")
      .then((d) => setDreams(d ?? []))
      .catch(() => {
        // 取得失敗は非致命: 空のダッシュボードを表示
      });
  }, [authStatus]);

  const monthDreams = useMemo(
    () => dreams.filter((d) => d.created_at && getJSTYearMonthKey(d.created_at) === ym),
    [dreams, ym]
  );

  const total = monthDreams.length;
  const streak = useMemo(() => computeStreak(dreams), [dreams]);

  const emotionCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of monthDreams) {
      for (const t of resolveDreamEmotionNames(d)) {
        const label = getChildFriendlyEmotionLabel(t);
        m.set(label, (m.get(label) ?? 0) + 1);
      }
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [monthDreams]);

  const positiveRate = useMemo(() => {
    let pos = 0;
    let all = 0;
    for (const [label, n] of emotionCounts) {
      all += n;
      if (POSITIVE.some((p) => label.includes(p))) pos += n;
    }
    return all ? Math.round((pos / all) * 100) : 0;
  }, [emotionCounts]);

  const topEmotion = emotionCounts[0]?.[0] ?? "—";
  const maxCount = emotionCounts[0]?.[1] ?? 1;

  if (authStatus === "checking") {
    return <Loading />;
  }
  if (authStatus === "unauthenticated") {
    return (
      <MorpheusLoginRequired
        title="きもちインサイトを見るにはログインが必要だよ"
        message="あなたの夢を集めて、今月の気持ちのうごきをまとめるページです。ログインすると、モルペウスと一緒に安全に振り返れます。"
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-1 py-6 md:py-8">
      <header className="mb-6">
        <p className="text-[12.5px] font-medium text-muted-foreground">
          {ym.replace("-", "年")}月のふりかえり
        </p>
        <h1 className="text-2xl font-bold text-foreground">きもちインサイト</h1>
      </header>

      {/* KPI */}
      <div className="mb-4 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <KpiCard label="今月の記録" value={String(total)} unit="こ" tone="text-foreground" />
        <KpiCard label="連続記録" value={String(streak)} unit="日" tone="text-orange-600 dark:text-orange-400" />
        <KpiCard label="前向きな夢" value={String(positiveRate)} unit="%" tone="text-emerald-600 dark:text-emerald-400" />
        <KpiCard label="いちばんの きもち" value={topEmotion} tone="text-primary" small />
      </div>

      {/* ヒートマップ + 月まとめ */}
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <MoodCalendar dreams={dreams} month={ym} />

        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-950 to-slate-900 p-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-75"
            style={{
              backgroundImage:
                "radial-gradient(2px 2px at 20% 24%, #fde68a, transparent), radial-gradient(1.6px 1.6px at 78% 30%, #fff, transparent), radial-gradient(1.6px 1.6px at 50% 60%, #c7d2fe, transparent)",
            }}
          />
          <div className="relative mb-3 flex items-center gap-3">
            <div className="motion-safe:animate-morpheus-float">
              <MorpheusAvatar variant="reward" size={46} className="ring-2 ring-white/20" />
            </div>
            <div>
              <h3 className="font-bold text-white">モルペウスの 月まとめ</h3>
              <span className="mt-0.5 inline-block rounded-full bg-violet-400/20 px-2 py-0.5 text-[10px] font-semibold text-violet-200">
                {user?.premium ? "プレミアム" : "プレビュー"}
              </span>
            </div>
          </div>
          <p className="relative text-[13px] leading-loose text-slate-200">
            {total > 0 ? (
              <>
                今月は <b className="text-sky-300">前向きな夢が{positiveRate}%</b>。 とくに「{topEmotion}」の気持ちが多く、心のうごきが見えてきたよ。
              </>
            ) : (
              <>今月はまだ記録がないみたい。ひとつ書くと、ここに今月のまとめが出るよ。</>
            )}
          </p>
        </section>
      </div>

      {/* TOP5 + トレンド */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3.5 font-bold text-card-foreground">きもち TOP5</h3>
          <div className="flex flex-col gap-3">
            {emotionCounts.slice(0, 5).map(([label, n]) => (
              <div key={label} className="flex items-center gap-2.5">
                <span className="w-24 shrink-0 truncate text-xs font-semibold text-muted-foreground">
                  {label}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${emotionToBar(label)}`}
                    style={{ width: `${Math.round((n / maxCount) * 100)}%` }}
                  />
                </div>
                <span className="w-5 text-right text-[11px] font-bold text-muted-foreground">
                  {n}
                </span>
              </div>
            ))}
            {emotionCounts.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                今月はまだ記録がありません
              </p>
            )}
          </div>
        </section>

        <MonthlyTrend dreams={dreams} />
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  unit,
  tone,
  small,
}: {
  label: string;
  value: string;
  unit?: string;
  tone: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-1.5 text-[11.5px] font-semibold text-muted-foreground">{label}</div>
      <div className={`font-black ${tone} ${small ? "mt-1 text-lg" : "text-2xl"}`}>
        {value}
        {unit && <span className="ml-0.5 text-sm font-bold text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

/** 直近6か月の記録数トレンド */
function MonthlyTrend({ dreams }: { dreams: Dream[] }) {
  const bars = useMemo(() => {
    const now = new Date();
    const out: { m: string; n: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = getJSTYearMonthKey(dt);
      const n = dreams.filter((d) => d.created_at && getJSTYearMonthKey(d.created_at) === key).length;
      out.push({ m: `${dt.getMonth() + 1}月`, n });
    }
    return out;
  }, [dreams]);

  const max = Math.max(1, ...bars.map((b) => b.n));
  const rising = bars.length >= 2 && bars[bars.length - 1].n >= bars[0].n;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3.5 flex items-center justify-between">
        <h3 className="font-bold text-card-foreground">記録の流れ（半年）</h3>
        {rising && <span className="text-[11px] font-semibold text-emerald-600">▲ 増加中</span>}
      </div>
      <div className="flex h-24 items-end gap-3 pt-1.5">
        {bars.map((b) => (
          <div key={b.m} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className="w-full rounded-t-md bg-gradient-to-b from-violet-400 to-primary"
              style={{ height: `${Math.max(8, (b.n / max) * 100)}%`, opacity: 0.55 + (b.n / max) * 0.45 }}
            />
            <span className="text-[10px] font-medium text-muted-foreground">{b.m}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** JST基準の連続記録日数 */
export function computeStreak(dreams: Dream[]): number {
  const days = new Set(
    dreams
      .filter((d) => d.created_at)
      .map((d) =>
        new Date(d.created_at).toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" })
      )
  );
  let streak = 0;
  const cur = new Date();
  for (;;) {
    const key = cur.toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
    if (days.has(key)) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    } else {
      // 今日まだ未記録でも、昨日まで続いていれば継続とみなす
      if (streak === 0) {
        cur.setDate(cur.getDate() - 1);
        const k2 = cur.toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
        if (days.has(k2)) continue;
      }
      break;
    }
  }
  return streak;
}
