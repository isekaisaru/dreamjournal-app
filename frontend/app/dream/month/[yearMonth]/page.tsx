"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { EmotionTag } from "@/app/components/EmotionTag";
import DreamList from "@/app/components/DreamList";
import { DreamListSkeleton } from "@/app/components/DreamCardSkeleton";
import MorpheusLoginRequired from "@/app/components/MorpheusLoginRequired";
import MorpheusImage from "@/app/components/MorpheusImage";
import { Dream } from "@/app/types";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/apiClient";
import { buildMonthlySummary } from "@/lib/monthlySummary";
import Loading from "@/app/loading";

function formatYearMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  if (!year || !month) return yearMonth;
  return `${year}年${Number(month)}月`;
}

export default function DreamByMonthPage() {
  const params = useParams();
  const yearMonthParam = params.yearMonth;
  const yearMonth =
    typeof yearMonthParam === "string" ? yearMonthParam : yearMonthParam?.[0];
  const monthLabel = formatYearMonthLabel(yearMonth ?? "");

  const [dreams, setDreams] = useState<Dream[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const { authStatus, user } = useAuth();

  const fetchDreamsByMonth = useCallback(async () => {
    if (!yearMonth || authStatus !== "authenticated") return;

    setIsLoading(true);
    try {
      const response = await apiClient.get<Dream[]>(`/dreams/month/${yearMonth}`);
      setDreams(response);
      setErrorMessage(null);
    } catch (error) {
      console.error("Error fetching dreams by month:", error);
      setErrorMessage("この月の ゆめを よみこめなかったよ。");
    } finally {
      setIsLoading(false);
    }
  }, [yearMonth, authStatus]);

  useEffect(() => {
    if (authStatus === "authenticated") {
      fetchDreamsByMonth();
    } else if (authStatus === "unauthenticated") {
      setIsLoading(false);
    }
  }, [authStatus, fetchDreamsByMonth]);

  const handleGenerateAiSummary = async () => {
    if (!yearMonth) return;
    setIsGenerating(true);
    setAiError(null);

    try {
      const res = await fetch(
        `/api/dreams/month/${yearMonth}/ai-summary`,
        { method: "POST" }
      );
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.summary) {
        throw new Error(data?.error ?? "サマリーの生成に失敗しました。");
      }
      setAiSummary(data.summary);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "エラーが発生しました。");
    } finally {
      setIsGenerating(false);
    }
  };

  if (authStatus === "checking") {
    return <Loading />;
  }

  if (authStatus === "unauthenticated") {
    return (
      <MorpheusLoginRequired
        title={`${monthLabel || "この月"}の夢を見るにはログインが必要だよ`}
        message="月ごとのふりかえりは、あなたの夢だけを集めた大切なページです。ログインすると、モルペウスと一緒に安全に見返せます。"
      />
    );
  }

  const summary = buildMonthlySummary(dreams, monthLabel);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <Link
              href="/home"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← ホームにもどる
            </Link>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              {monthLabel}の ゆめ
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              この月に見たゆめを まとめて ふりかえるページだよ。
            </p>
          </div>
        </div>

        {isLoading ? (
          <DreamListSkeleton count={4} />
        ) : errorMessage ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">
            {errorMessage}
          </p>
        ) : dreams.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
            <p className="text-lg font-bold">まだ この月の ゆめは ないよ</p>
            <p className="mt-2 text-sm text-muted-foreground">
              あたらしい ゆめを きろくすると、ここに月のまとめが出るよ。
            </p>
            <Link
              href="/dream/new"
              className="mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              ゆめを かく
            </Link>
          </div>
        ) : (
          <>
            {/* Monthly Summary Card */}
            <section className="mb-6 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
              <div className="grid gap-0 md:grid-cols-[1.25fr_0.75fr]">
                <div className="p-5 md:p-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                    Monthly Summary
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">
                    モルペウスの ひとこと
                  </h2>

                  {user?.premium ? (
                    /* プレミアム: AIサマリー */
                    <div className="mt-3">
                      {aiSummary ? (
                        <p className="text-sm leading-7 text-muted-foreground">
                          {aiSummary}
                        </p>
                      ) : (
                        <>
                          <p className="text-sm leading-7 text-muted-foreground">
                            {summary.message}
                          </p>
                          <button
                            type="button"
                            onClick={handleGenerateAiSummary}
                            disabled={isGenerating}
                            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isGenerating ? (
                              <>
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                モルペウスが ふりかえりちゅう…
                              </>
                            ) : (
                              "✨ AIサマリーを生成する"
                            )}
                          </button>
                          {aiError && (
                            <p className="mt-2 text-xs text-destructive">
                              {aiError}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    /* 非プレミアム: ゲート */
                    <div className="mt-3 rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-5">
                      <p className="text-sm font-semibold text-foreground">
                        ✨ AIサマリーはプレミアム会員限定です
                      </p>
                      <p className="mt-1 text-xs leading-6 text-muted-foreground">
                        モルペウスが この月の夢をAIで分析して、
                        <br />
                        あなただけのひとことを つくってくれるよ。
                      </p>
                      <Link
                        href="/subscription"
                        className="mt-3 inline-flex min-h-9 items-center rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        プレミアムにアップグレード
                      </Link>
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    {summary.highlights.map((highlight) => (
                      <span
                        key={highlight}
                        className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground"
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>

                  {summary.topEmotions.length > 0 && (
                    <div className="mt-5">
                      <p className="mb-2 text-xs font-semibold text-muted-foreground">
                        よく出てきた きもち
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {summary.topEmotions.map(({ label, count }) => (
                          <div
                            key={label}
                            className="inline-flex items-center gap-2 rounded-full bg-muted px-2.5 py-1.5"
                          >
                            <EmotionTag label={label} />
                            <span className="text-xs font-semibold text-muted-foreground">
                              {count}回
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center border-t border-border bg-slate-100/70 p-5 dark:bg-slate-900/50 md:border-l md:border-t-0">
                  <div className="text-center">
                    <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-[2rem] bg-white/70 shadow-sm ring-1 ring-slate-200 dark:bg-slate-950/40 dark:ring-slate-700/60">
                      <MorpheusImage
                        variant="analysis"
                        size={128}
                        className="h-32 w-32 object-contain"
                      />
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      ゆめを ふりかえると、つぎの ゆめも おもしろくなるかも。
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Stats */}
            <section className="mb-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs font-semibold text-muted-foreground">
                  きろくした ゆめ
                </p>
                <p className="mt-2 text-3xl font-bold">{summary.dreamCount}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs font-semibold text-muted-foreground">
                  きろくした ひ
                </p>
                <p className="mt-2 text-3xl font-bold">{summary.recordedDays}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs font-semibold text-muted-foreground">
                  ぶんせきずみ
                </p>
                <p className="mt-2 text-3xl font-bold">{summary.analyzedCount}</p>
              </div>
            </section>

            {/* Dream list */}
            <section>
              <h2 className="px-4 pt-4 text-lg font-bold">この月の ゆめ一覧</h2>
              <DreamList dreams={dreams} />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
