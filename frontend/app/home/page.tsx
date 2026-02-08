import DreamList from "@/app/components/DreamList";
import SearchBar from "@/app/components/SearchBar";
import Link from "next/link";
import { Dream } from "@/app/types";
import { cookies } from "next/headers";
import { getMyDreams, getMe } from "@/lib/apiClient";
import type { User } from "@/app/types";
import MorpheusAssistant from "./MorpheusAssistant";
import VoiceRecorderClient from "./VoiceRecorderClient";

/**
 * HomePageコンポーネント
 * - 認証されたユーザーが見るホームページ
 */
/**
 * 夢を月ごとにグループ化する関数
 * @param {Dream[]} dreams - 夢データの配列
 * @returns {Record<string, Dream[]>} 年月ごとの夢データのマッピング
 */

function groupDreamsByMonth(dreams: Dream[]) {
  return dreams.reduce(
    (groupedDreams, dream) => {
      const date = new Date(dream.created_at);
      const yearMonth = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      if (!groupedDreams[yearMonth]) {
        groupedDreams[yearMonth] = [];
      }

      groupedDreams[yearMonth].push(dream);
      return groupedDreams;
    },
    {} as Record<string, Dream[]>
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { unstable_noStore as noStore } from "next/cache";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Ensure the component is treated as dynamic and opts out of strict caching
  noStore();

  console.log("[HomePage] Rendering at", new Date().toISOString());

  // クロスドメイン環境（Vercel × Render）では、Server側でCookieをチェックできない
  // AuthContextで認証を管理するため、ここではチェックしない
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value || "";

  const resolvedSearchParams = await searchParams;

  const queryParams = new URLSearchParams();
  if (resolvedSearchParams.query)
    queryParams.set("query", String(resolvedSearchParams.query));

  // デフォルトで過去1ヶ月分を表示（パラメータがない場合）
  if (resolvedSearchParams.startDate) {
    queryParams.set("start_date", String(resolvedSearchParams.startDate));
  } else if (!resolvedSearchParams.query && !resolvedSearchParams.endDate) {
    // 検索条件が何もない場合のみ、デフォルト期間を設定
    // ここでは「全期間」を表示するためにあえて絞り込みをしない（API仕様によるが、通常は全件取得になるはず）
  }

  if (resolvedSearchParams.endDate)
    queryParams.set("end_date", String(resolvedSearchParams.endDate));

  let dreams: Dream[] = [];
  let user: User | null = null;
  let errorMessage: string | null = null;

  // Note: Removed local timestamp (_t) to prevent "Unpermitted parameter" warnings in Rails.
  // noStore() + force-dynamic should be sufficient to ensure fresh data using cache: "no-store".

  try {
    [dreams, user] = await Promise.all([
      getMyDreams(token, queryParams),
      getMe(token),
    ]);
  } catch (error) {
    // クロスドメイン環境では、Server側でリダイレクトせず、
    // AuthContextに任せる
    console.error("Error fetching data on server:", error);
    errorMessage =
      "データの取得に失敗しました。ページを再読み込みしてください。";
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
        {/* Debug: Server Rendering Time to verify router.refresh() */}
        <p className="text-xs text-muted-foreground/50 mb-2">
          Last updated: {new Date().toLocaleTimeString()}
        </p>
        <SearchBar
          query={resolvedSearchParams.query}
          startDate={resolvedSearchParams.startDate}
          endDate={resolvedSearchParams.endDate}
        />
        {/* エラーメッセージがある場合は表示 */}
        {errorMessage && (
          <div className="text-destructive mb-4">{errorMessage}</div>
        )}
        {/* 夢リストコンポーネント */}
        {/* Key prop ensures re-mount when latest dream ID or count changes, fixing stale UI issue */}
        <DreamList
          dreams={dreams}
          key={`${dreams[0]?.id}-${dreams.length}-${Date.now()}`}
        />{" "}
        {/* 夢データをリストして表示 */}
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
          {Object.entries(groupedDreams).map(([yearMonth, dreams]) => (
            <li key={yearMonth}>
              <Link
                href={`/dream/month/${yearMonth}`}
                className="text-primary hover:text-primary/90 hover:underline"
              >
                {new Date(dreams[0].created_at).toLocaleString("ja-JP", {
                  year: "numeric",
                  month: "long",
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
