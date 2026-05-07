"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Dream, Emotion, AgeGroup } from "@/app/types";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/apiClient";
import { getEmotions, getAnalysisQuota, AnalysisQuota } from "@/lib/apiClient";
import { getJSTYearMonthKey } from "@/lib/date";
import DreamList from "@/app/components/DreamList";
import { DreamListSkeleton } from "@/app/components/DreamCardSkeleton";
import DreamStatsWidget from "@/app/components/DreamStatsWidget";
import DreamStreakBadge from "@/app/components/DreamStreakBadge";
import SearchBar from "@/app/components/SearchBar";
import DreamEntryLauncher from "@/app/components/DreamEntryLauncher";
import DreamAdventurePanel from "@/app/components/DreamAdventurePanel";
import { MorpheusGuideHome } from "@/app/components/MorpheusGuide";
import MorpheusHero from "@/app/components/MorpheusHero";
import MorpheusLoginRequired from "@/app/components/MorpheusLoginRequired";
import Loading from "../loading";

/**
 * 年齢帯別ウェルカムコピー
 */
function getHomeCopy(ageGroup: AgeGroup | undefined) {
  switch (ageGroup) {
    case "child_small":
      return {
        heading: "きょうの ゆめを のこそう",
        sub: "ことばでも こえでも だいじょうぶだよ。",
        button: "ゆめを のこす",
        helper: "おすと えらべるよ",
      };
    case "child":
      return {
        heading: "きょうの ゆめを すぐ のこそう",
        sub: "ねむい あさでも だいじょうぶ。ことばでも、こえでも のこせるよ。",
        button: "きょうの ゆめを のこす",
        helper: "おすと、のこしかたを えらべるよ",
      };
    case "preteen":
      return {
        heading: "今日の夢、記録しよう",
        sub: "テキストでも音声でも残せるよ。忘れる前にメモしておこう。",
        button: "夢を記録する",
        helper: "記録方法を選べるよ",
      };
    case "teen":
      return {
        heading: "今日の夢を残しておこう",
        sub: "見た夢はすぐ忘れる。テキストでも音声でも、今すぐ記録できる。",
        button: "夢を記録する",
        helper: "記録方法を選択",
      };
    case "adult":
    default:
      return {
        heading: "今日の夢を記録する",
        sub: "テキスト入力または音声録音で、すばやく残せます。",
        button: "夢を記録する",
        helper: "記録方法を選択できます",
      };
  }
}

function getToneClassByHour(hour: number) {
  if (hour < 6) {
    return {
      backgroundImage:
        "radial-gradient(circle at top, rgba(56,189,248,0.16), transparent 32%), linear-gradient(180deg, rgba(15,23,42,0.96), rgba(30,41,59,0.96))",
    };
  }
  if (hour < 11) {
    return {
      backgroundImage:
        "radial-gradient(circle at top, rgba(251,191,36,0.16), transparent 34%), linear-gradient(180deg, rgba(255,255,255,0.95), rgba(239,246,255,0.96))",
    };
  }
  if (hour < 17) {
    return {
      backgroundImage:
        "radial-gradient(circle at top, rgba(125,211,252,0.14), transparent 34%), linear-gradient(180deg, rgba(248,250,252,0.96), rgba(224,242,254,0.96))",
    };
  }
  return {
    backgroundImage:
      "radial-gradient(circle at top, rgba(251,146,60,0.18), transparent 34%), linear-gradient(180deg, rgba(255,247,237,0.96), rgba(254,215,170,0.24))",
  };
}

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
  const [analysisQuota, setAnalysisQuota] = useState<AnalysisQuota | null>(null);

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

  // 月次AI分析残数をフリープランユーザーのみ取得
  useEffect(() => {
    if (authStatus !== "authenticated" || user?.premium) return;
    getAnalysisQuota()
      .then(setAnalysisQuota)
      .catch(() => {
        // 非致命的: バッジを表示しないだけ
      });
  }, [authStatus, user?.premium]);

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
      <MorpheusLoginRequired
        title="ホームを見るにはログインが必要だよ"
        message="夢の一覧は、あなた専用の本棚みたいな場所です。ログインすると、前に書いた夢やモルペウスの分析を安全に見られます。"
      />
    );
  }

  // 夢データを月ごとにグループ化
  const groupedDreams = groupDreamsByMonth(dreams);

  const copy = getHomeCopy(user?.age_group);

  const shouldDeferSearch =
    !loading &&
    !isSearchActive &&
    !isSearchPanelOpen &&
    dreams.length > 0 &&
    dreams.length < 5;
  const homeToneStyle = getToneClassByHour(new Date().getHours());

  return (
    <div
      className="lg:flex text-foreground rounded-[2rem] p-2 md:p-3"
      style={homeToneStyle}
    >
      {/* メインセクション: ユーザー名の下に夢リストを表示 */}
      <section className="w-full lg:w-2/3 flex flex-col items-center px-3 md:px-6">
        <MorpheusHero
          expression="cheerful"
          variant="home"
          title={user ? `${user.username}さん、おはよう！` : "おはよう！"}
          message={`${copy.heading} ${copy.sub}`}
          size={164}
          className="w-full mb-4"
          action={
            <div className="max-w-md">
              <DreamEntryLauncher
                buttonLabel={copy.button}
                buttonSize="lg"
                buttonClassName="min-h-14 w-full text-base font-bold shadow-lg shadow-primary/15"
                helperText={copy.helper}
                showSparkles
              />
            </div>
          }
        />
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
            ageGroup={user?.age_group}
            key={`${dreams[0]?.id}-${dreams.length}`}
          />
        )}
      </section>

      {/* サイドバー: 統計・ストリーク・月ごとリンク */}
      <aside className="w-full lg:w-1/3 flex flex-col items-center px-3 md:px-6 mt-4 lg:mt-0">
        {/* 今日の夢クエスト */}
        {!loading && !errorMessage && <DreamAdventurePanel dreams={dreams} />}

        {/* 連続記録バッジ */}
        <DreamStreakBadge dreams={dreams} />

        {/* 感情タグ統計 */}
        <DreamStatsWidget dreams={dreams} />

        {/* 月次AI分析残数バッジ（フリープランのみ） */}
        {analysisQuota && !analysisQuota.unlimited && !analysisQuota.trial && (
          <div className="bg-card border border-border rounded-xl p-4 w-full mb-4">
            <h3 className="font-bold text-card-foreground mb-2 flex items-center gap-2">
              <span>✨</span>
              <span>今月のAI分析</span>
            </h3>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    analysisQuota.remaining === 0
                      ? "bg-destructive"
                      : analysisQuota.remaining! <= 2
                      ? "bg-amber-400"
                      : "bg-primary"
                  }`}
                  style={{
                    width: `${Math.min(((analysisQuota.used ?? 0) / (analysisQuota.limit ?? 10)) * 100, 100)}%`,
                  }}
                />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {analysisQuota.used ?? 0} / {analysisQuota.limit ?? 10}
              </span>
            </div>
            {analysisQuota.remaining === 0 ? (
              <p className="text-xs text-destructive">
                今月の上限に達しました。
                <Link href="/subscription" className="underline ml-1">プレミアムで無制限に</Link>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                残り{" "}
                <span className={`font-bold ${analysisQuota.remaining! <= 2 ? "text-amber-500" : "text-foreground"}`}>
                  {analysisQuota.remaining}回
                </span>
              </p>
            )}
          </div>
        )}

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
          {Object.entries(groupedDreams).map(([yearMonth, monthDreams]) => {
            const monthName = new Date(monthDreams[0].created_at).toLocaleString("ja-JP", {
              year: "numeric",
              month: "long",
              timeZone: "Asia/Tokyo",
            });
            return (
              <li key={yearMonth}>
                <Link
                  href={`/dream/month/${yearMonth}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm transition-colors hover:bg-muted"
                >
                  <span className="font-medium text-foreground">
                    {monthName}の夢
                  </span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{monthDreams.length}こ</span>
                    {user?.premium && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        サマリー
                      </span>
                    )}
                    <span>→</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </aside>
      <MorpheusGuideHome
        title={user?.age_group === "child_small" || user?.age_group === "child"
          ? "きょうは？"
          : "今日はどんな夢だった？"}
        message={copy.sub}
      />
    </div>
  );
}
