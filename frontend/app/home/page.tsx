"use client";

import { useEffect, useState, useCallback } from "react";
import DreamList from "@/app/components/DreamList";
import SearchBar from "@/app/components/SearchBar";
import Link from "next/link";
import axios from "axios";
import { Dream, User } from "@/app/types";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
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
      const date = new Date(dream.created_at); // 夢の日付をDateオブジェクトに変換
      const yearMonth = `${date.getFullYear()}-${(
        "0" +
        (date.getMonth() + 1)
      ).slice(-2)}`; //"2024-01"の形式

      if (!groupedDreams[yearMonth]) {
        groupedDreams[yearMonth] = [];
      }

      groupedDreams[yearMonth].push(dream);
      return groupedDreams;
    },
    {} as Record<string, Dream[]>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { isLoggedIn, userId, getValidAccessToken } = useAuth(); // ユーザーの認証状態を取得
  const [dreams, setDreams] = useState<Dream[]>([]); //夢データの状態管理
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // エラーメッセージの状態管理
  const [user, setUser] = useState<User | null>(null); // ユーザーデータの状態管理

  // ユーザーデータと夢データを取得する関数
  const fetchUserData = useCallback(
    async (query = "", startDate = "", endDate = "") => {
    try {
      const token = await getValidAccessToken(); // 有効なアクセストークンを取得
      if (!token || token === "null" || token === "undefined") {
        console.warn(
          "HomePage: No valid token for fetching data. AuthContext should have redirected if initial check failed."
        );
        return;
      }

      // ユーザー情報と夢データを取得するAPIエンドポイントにGETリクエストを送信
      const userResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/me`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (userResponse.data && userResponse.data.user) {
        setUser(userResponse.data.user);
      } else {
        console.warn(
          "User data not found in /auth/me response:",
          userResponse.data
        );
      }

      const params: Record<string, string> = {};
      if (query) params.query = query;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      // 夢データ取得APIエンドポイントにGETリクエストを送信
      const dreamsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/dreams/my_dreams`,
        { headers: { Authorization: `Bearer ${token}` }, params }
      );
      setDreams(dreamsResponse.data); //夢データの状態を更新
      setErrorMessage(null);
    } catch (error) {
      console.error("Error fetching user data:", error);

      if (axios.isAxiosError(error)) {
        if (error.response?.data.message) {
          setErrorMessage(error.response.data.message);
        } else if (error.response?.data.error) {
          setErrorMessage(error.response.data.error);
        } else {
          setErrorMessage("夢のデータの取得に失敗しました。");
        }
      } else {
        setErrorMessage("予期しないエラーが発生しました。");
      }
    }
    },
    [getValidAccessToken]);

  // isLoggedinが変更されたときにユーザーデータを取得
  useEffect(() => {
    if (isLoggedIn && userId) {
      fetchUserData();
    } else if (isLoggedIn === false) {
      setDreams([]); // 夢データを空に設定
      setUser(null); // ユーザーデータを空に設定
      setErrorMessage(null); // エラーメッセージをリセット
    }
  }, [isLoggedIn, userId, fetchUserData]);

  useEffect(() => {
    if (isLoggedIn === true) {
      const registrationSuccess = sessionStorage.getItem("registrationSuccess");
      if (registrationSuccess === "true") {
        toast.success("ようこそ！ユーザー登録が完了しました。");
        sessionStorage.removeItem("registrationSuccess");
      }
    }
  }, [isLoggedIn]);

  if (isLoggedIn === null) {
    return <Loading />;
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
        <SearchBar onSearch={fetchUserData} />
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
