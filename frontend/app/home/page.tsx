"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Dream, Emotion } from "@/app/types";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/apiClient";
import { getEmotions } from "@/lib/apiClient";
import { getJSTYearMonthKey } from "@/lib/date";
import DreamList from "@/app/components/DreamList";
import { DreamListSkeleton } from "@/app/components/DreamCardSkeleton";
import DreamStatsWidget from "@/app/components/DreamStatsWidget";
import DreamStreakBadge from "@/app/components/DreamStreakBadge";
import SearchBar from "@/app/components/SearchBar";
import DreamEntryLauncher from "@/app/components/DreamEntryLauncher";
import MorpheusAssistant from "./MorpheusAssistant";
import Loading from "../loading";

/**
 * 夢を月ごとにグループ化する関数
 */
function groupDreamsByMonth(dreams: Dream[]) {
  return dreams.reduce(
    (groupedDreams, dream) => {
      const yearMonth = getJSTYearMonthKey(dream.created_at);

      if (!groupedDreams[yearMonth]) {
        groupedDreams[yearMonth] = [];
      }

      groupedDreams[yearMonth].push(dream);
      return groupedDreams;
    },
    {} as Record<string, Dream[]>
  );
}

/**
 * HomePageコンポーネント
 * - 認証されたユーザーが見るホームページ
 * - クロスドメイン環境（Vercel × Render）のため、Client Componentで実装
 */
export default function HomePage() {
  const { authStatus, user } = useAuth();
  const searchParams = useSearchParams();

  const [dreams, setDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emotions, setEmotions] = useState<Emotion[]>([]);
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);

  const fetchDreams = useCallback(async () => {
    if (authStatus !== "authenticated") {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // 検索パラメータを構築
      const queryParams = new URLSearchParams();
      const query = searchParams.get("query");
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");
      const emotionIds = searchParams.getAll("emotion_ids[]");

      if (query) queryParams.set("query", query);
      if (startDate) queryParams.set("start_date", startDate);
      if (endDate) queryParams.set("end_date", endDate);
      emotionIds.forEach((id) => queryParams.append("emotion_ids[]", id));

      // APIから夢データを取得
      const queryString = queryParams.toString();
      const url = queryString ? `/dreams?${queryString}` : "/dreams";
      const dreamsData = await apiClient.get<Dream[]>(url);

      setDreams(dreamsData);
    } catch (error) {
      console.error("Error fetching dreams:", error);
      setErrorMessage(
        "データの取得に失敗しました。ページを再読み込みしてください。"
      );
    } finally {
      setLoading(false);
    }
  }, [authStatus, searchParams]);

  // 初回マウント時と検索パラメータが変わった時にデータを取得
  useEffect(() => {
    if (authStatus === "authenticated") {
      fetchDreams();
    } else if (authStatus === "unauthenticated") {
      setLoading(false);
    }
  }, [authStatus, fetchDreams]);

  // 感情タグ一覧を初回マウント時に取得
  useEffect(() => {
    getEmotions()
      .then(setEmotions)
      .catch(() => {
        // 感情タグ取得失敗は非致命的: 検索フォームを通常表示するだけ
      });
  }, []);

  // dream-createdイベントをリッスン（夢が新規作成されたときにリストを更新）
  useEffect(() => {
    const handleDreamCreated = () => {
      fetchDreams();
    };

    window.addEventListener("dream-created", handleDreamCreated);
    return () => {
      window.removeEventListener("dream-created", handleDreamCreated);
    };
  }, [fetchDreams]);

  // dream-analysis-completedイベントをリッスン（夢分析完了時にリストを更新）
  useEffect(() => {
    const handleDreamAnalysisCompleted = () => {
      fetchDreams();
    };

    window.addEventListener(
      "dream-analysis-completed",
      handleDreamAnalysisCompleted
    );
    return () => {
      window.removeEventListener(
        "dream-analysis-completed",
        handleDreamAnalysisCompleted
      );
    };
  }, [fetchDreams]);

  // 検索フィルターが有効かどうかを判定（フックより前に計算）
  const isSearchActive = !!(
    searchParams.get("query") ||
    searchParams.get("startDate") ||
    searchParams.get("endDate") ||
    searchParams.getAll("emotion_ids[]").length > 0
  );

  // 検索がアクティブになったらパネルを開く（条件分岐より前に置く必要あり）
  useEffect(() => {
    if (isSearchActive) {
      setIsSearchPanelOpen(true);
    }
  }, [isSearchActive]);

  // 認証確認中
  if (authStatus === "checking") {
    return <Loading />;
  }

  // 未認証
  if (authStatus === "unauthenticated") {
    return (
      <div className="container mx-auto p-5 bg-background text-foreground">
        <p>このページを表示するにはログインが必要です。</p>
      </div>
    );
  }

  // 夢データを月ごとにグループ化
  const groupedDreams = groupDreamsByMonth(dreams);

  const shouldDeferSearch =
    !loading &&
    !isSearchActive &&
    !isSearchPanelOpen &&
    dreams.length > 0 &&
    dreams.length < 5;

  return (
    <div className="lg:flex text-foreground">
      {/* メインセクション: ユーザー名の下に夢リストを表示 */}
      <section className="w-full lg:w-2/3 flex flex-col items-center px-3 md:px-6">
        <div className="w-full rounded-3xl border border-border/70 bg-card px-5 py-5 shadow-sm">
          <p className="text-sm font-semibold text-primary">
            {user ? `${user.username}さん、おはよう` : "おはよう"}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            きょうの ゆめを すぐ のこそう
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            ねむい あさでも だいじょうぶ。ことばでも、こえでも のこせるよ。
          </p>
          <div className="mt-4 max-w-md">
            <DreamEntryLauncher
              buttonLabel="きょうの ゆめを のこす"
              buttonSize="lg"
              buttonClassName="min-h-14 w-full text-base font-bold shadow-lg shadow-primary/15"
              helperText="おすと、のこしかたを えらべるよ"
              showSparkles
            />
          </div>
        </div>
        {shouldDeferSearch ? (
          <div className="mt-4 w-full rounded-2xl border border-border/70 bg-card px-4 py-4 shadow-sm">
            <p className="text-sm font-medium text-card-foreground">
              けんさくは まだ しまってあるよ
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              ゆめが ふえてからでも だいじょうぶ。ひつような ときだけ ひらこう。
            </p>
            <button
              type="button"
              onClick={() => setIsSearchPanelOpen(true)}
              className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              まえの ゆめを さがす
            </button>
          </div>
        ) : (
          <SearchBar
            query={searchParams.get("query") || undefined}
            startDate={searchParams.get("startDate") || undefined}
            endDate={searchParams.get("endDate") || undefined}
            emotions={emotions}
            selectedEmotionIds={searchParams.getAll("emotion_ids[]")}
          />
        )}

        {/* ローディング中: スケルトンカードを表示 */}
        {loading && <DreamListSkeleton count={6} />}
        {/* エラーメッセージがある場合は表示 */}
        {errorMessage && (
          <div className="text-destructive mb-4">{errorMessage}</div>
        )}
        {/* 夢リストコンポーネント */}
        {!loading && !errorMessage && (
          <DreamList
            dreams={dreams}
            isSearchActive={isSearchActive}
            key={`${dreams[0]?.id}-${dreams.length}`}
          />
        )}
      </section>

      {/* サイドバー: 統計・ストリーク・月ごとリンク */}
      <aside className="w-full lg:w-1/3 flex flex-col items-center px-3 md:px-6 mt-4 lg:mt-0">
        {/* 連続記録バッジ */}
        <DreamStreakBadge dreams={dreams} />

        {/* 感情タグ統計 */}
        <DreamStatsWidget dreams={dreams} />

        {/* 月別アーカイブリンク */}
        <div className="bg-card text-card-foreground shadow-md rounded-xl p-4 mb-4 border border-border w-full">
          <h3 className="font-bold text-card-foreground mb-2">
            まえに みた ゆめ
          </h3>
          <p className="text-muted-foreground text-sm">
            まえに みた ゆめ を見てみよう！
          </p>
        </div>
        <ul className="space-y-2 w-full">
          {Object.entries(groupedDreams).map(([yearMonth, monthDreams]) => (
            <li key={yearMonth}>
              <Link
                href={`/dream/month/${yearMonth}`}
                className="text-primary hover:text-primary/90 hover:underline text-sm"
              >
                {new Date(monthDreams[0].created_at).toLocaleString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  timeZone: "Asia/Tokyo",
                })}
                の夢
              </Link>
            </li>
          ))}
        </ul>
      </aside>
      <MorpheusAssistant />
    </div>
  );
}
