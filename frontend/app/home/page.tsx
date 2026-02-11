"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Dream } from "@/app/types";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/apiClient";
import DreamList from "@/app/components/DreamList";
import SearchBar from "@/app/components/SearchBar";
import MorpheusAssistant from "./MorpheusAssistant";
import VoiceRecorderClient from "./VoiceRecorderClient";
import Loading from "../loading";

/**
 * 夢を月ごとにグループ化する関数
 */
function groupDreamsByMonth(dreams: Dream[]) {
  return dreams.reduce(
    (groupedDreams, dream) => {
      const date = new Date(dream.created_at);
      // Vercelサーバー（UTC）でも日本時間で正しくグループ化するためtimeZoneを明示指定
      const year = date.toLocaleString("ja-JP", { year: "numeric", timeZone: "Asia/Tokyo" });
      const month = date.toLocaleString("ja-JP", { month: "2-digit", timeZone: "Asia/Tokyo" });
      const yearMonth = `${year}-${month}`;

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

      if (query) queryParams.set("query", query);
      if (startDate) queryParams.set("start_date", startDate);
      if (endDate) queryParams.set("end_date", endDate);

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

  return (
    <div className="md:flex text-foreground">
      {/* メインセクション: ユーザー名の下に夢リストを表示 */}
      <section className="w-full md:w-2/3 flex flex-col items-center px-3 md:px-6">
        <h1 className="text-2xl font-bold text-foreground">
          {user ? `${user.username}ちゃんの ゆめ日記` : "ゆめ日記"}
        </h1>
        <SearchBar
          query={searchParams.get("query") || undefined}
          startDate={searchParams.get("startDate") || undefined}
          endDate={searchParams.get("endDate") || undefined}
        />
        {/* ローディング中 */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">読み込み中...</div>
          </div>
        )}
        {/* エラーメッセージがある場合は表示 */}
        {errorMessage && (
          <div className="text-destructive mb-4">{errorMessage}</div>
        )}
        {/* 夢リストコンポーネント */}
        {!loading && !errorMessage && (
          <DreamList
            dreams={dreams}
            key={`${dreams[0]?.id}-${dreams.length}`}
          />
        )}
      </section>

      {/* サイドバー: 月ごとの夢リンクを動的に表示 */}
      <aside className="w-full md:w-1/3 flex flex-col items-center px-3 md:px-6 mt-4 md:mt-0">
        <div className="bg-card text-card-foreground shadow-md rounded p-4 mb-6 border border-border">
          <h3 className="font-bold text-card-foreground mb-2">
            まえに みた ゆめ
          </h3>
          <p className="text-muted-foreground">
            まえに みた ゆめ を見てみよう！
          </p>
        </div>
        <ul className="space-y-2">
          {/* 月ごとの夢リンクを表示 */}
          {Object.entries(groupedDreams).map(([yearMonth, monthDreams]) => (
            <li key={yearMonth}>
              <Link
                href={`/dream/month/${yearMonth}`}
                className="text-primary hover:text-primary/90 hover:underline"
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
      <VoiceRecorderClient />
    </div>
  );
}
