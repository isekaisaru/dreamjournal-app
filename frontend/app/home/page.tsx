import { Suspense } from "react";
import DreamList from "@/app/components/DreamList";
import SearchBar from "@/app/components/SearchBar";
import Link from "next/link";
import { Dream } from "@/app/types";
import { cookies } from "next/headers";
import { getMyDreams, getMe, User } from "@/lib/apiClient";
import { redirect } from "next/navigation";
import Loading from "../loading";

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

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    redirect("/login");
  }

  const resolvedSearchParams = await searchParams;
  const queryParams = new URLSearchParams();
  if (resolvedSearchParams.query)
    queryParams.set("query", String(resolvedSearchParams.query));
  if (resolvedSearchParams.startDate)
    queryParams.set("start_date", String(resolvedSearchParams.startDate));
  if (resolvedSearchParams.endDate)
    queryParams.set("end_date", String(resolvedSearchParams.endDate));

  let dreams: Dream[] = [];
  let user: User | null = null;
  let errorMessage: string | null = null;

  try {
    [dreams, user] = await Promise.all([
      getMyDreams(token, queryParams),
      getMe(token),
    ]);
  } catch (error) {
    // fetch に失敗した場合、特にトークンが無効(401)な場合は、
    // ログインページにリダイレクトするのが安全。
    if (error instanceof Error && error.message.includes("401")) {
      redirect("/login");
    }
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
          {user ? `${user.username}さんの夢` : "夢リスト"}
        </h1>
        <Suspense fallback={<Loading />}>
          <SearchBar />
        </Suspense>
        {/* エラーメッセージがある場合は表示 */}
        {errorMessage && (
          <div className="text-destructive mb-4">{errorMessage}</div>
        )}
        {/* 夢リストコンポーネント */}
        <DreamList dreams={dreams} /> {/* 夢データをリストして表示 */}
      </section>

      {/* サイドバー: 月ごとの夢リンクを動的に表示 */}
      <aside className="w-full md:w-1/3 flex flex-col items-center px-3 md:px-6 mt-4 md:mt-0">
        <div className="bg-card text-card-foreground shadow-md rounded p-4 mb-6 border border-border">
          <h3 className="font-bold text-card-foreground mb-2">前に見た夢</h3>
          <p className="text-muted-foreground">
            前に見た夢を振り返ってみましょう！
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
    </div>
  );
}
