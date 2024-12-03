"use client";

import { useEffect, useState } from "react";
import DreamList from "@/components/DreamList";
import SearchBar from "@/components/SearchBar";
import Link from "next/link";
import axios, { AxiosError } from "axios";
import { Dream } from "@/app/types"; 
/**
 * HomePageコンポーネント
 * - 認証されたユーザーが見るホームページ
 */
interface User {
  id: number;
  email: string;
  username: string;
}
/**
 * 夢を月ごとにグループ化する関数
 * @param {Dream[]} dreams - 夢データの配列
 * @returns {Record<string, Dream[]>} 年月ごとの夢データのマッピング
 */

function groupDreamsByMonth(dreams: Dream[]) {
  return dreams.reduce((groupedDreams, dream) => {
    const date = new Date(dream.created_at); // 夢の日付をDateオブジェクトに変換
    const yearMonth = `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)}`; //"2024-01"の形式

    if (!groupedDreams[yearMonth]) {
      groupedDreams[yearMonth] = [];
    }

    groupedDreams[yearMonth].push(dream);
    return groupedDreams;
  }, {} as Record<string, Dream[]>);
}

export default function HomePage() {
  const [dreams, setDreams] = useState<Dream[]>([]); //夢データの状態管理
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // エラーメッセージの状態管理
  const [user, setUser] = useState<User | null>(null); // ユーザーデータの状態管理

  // ユーザーデータと夢データを取得する関数
  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token'); // ローカルストレージからトークンを取得
      if (!token) {
        // トークンが見つからない場合はエラーメッセージを設定して、データ取得をスキップ
        setErrorMessage('トークンが見つかりません。 ログインが必要です。'); 
        return; // トークンがない場合はリクエストをスキップ
      }
      
      // ユーザー情報と夢データを取得するAPIエンドポイントにGETリクエストを送信
      const userResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/me`, {
        headers: { 
          Authorization: `Bearer ${token}`,
         }, //認証ヘッダーを設定
      });

      setUser(userResponse.data.user); // ユーザーデータを状態に設定
      
      // 夢データ取得APIエンドポイントにGETリクエストを送信
      const dreamsResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/dreams/my_dreams`, {
        headers: { Authorization: `Bearer ${token}`, // 認証ヘッダーを設定
       },
      });

      setDreams(dreamsResponse.data); //夢データの状態を更新
    } catch (error: unknown) {
      console.error('Error fetching user data:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.data.message) {
          setErrorMessage(error.response.data.message);
        } else {
          setErrorMessage('夢のデータの取得に失敗しました。認証エラーです。');
        }
      } else {
        setErrorMessage('予期しないエラーが発生しました。');
      }
    }
  };

  useEffect(() => {
    fetchUserData(); //コンポーネントがマウントされたときにユーザーデータを取得
  }, []);

  // 夢データを月ごとにグループ化
  const groupedDreams = groupDreamsByMonth(dreams);

  return (
    <div className="md:flex">
      {/* メインセクション: ユーザー名の下に夢リストを表示 */}  
      <section className="w-full md:w-2/3 flex flex-col items-center px-3 md:px-6">
        <h1 className="text-2xl font-bold">
          {user ? `${user.username}さんの夢` : '夢リスト'}
        </h1>
        <SearchBar onSearch={fetchUserData} />
        
        {/* エラーメッセージがある場合は表示 */}
        {errorMessage && (
          <div className="text-red-500 mb-4">
            {errorMessage}</div>
            )}

        { /* 夢リストコンポーネント */}
        <DreamList dreams={dreams} /> {/* 夢データをリストして表示 */}
      </section>

     {/* サイドバー: 月ごとの夢リンクを動的に表示 */}
      <aside className="w-full md:w-1/3 flex flex-col items-center px-3 md:px-6 mt-4 md:mt-0">
        <div className="bg-white shadow-md rounded p-4 mb-6">
          <h3 className="font-bold text-gray-600 mb-2">前に見た夢</h3>
          <p className="text-gray-600">
            前に見た夢を振り返ってみましょう！
          </p>
        </div>
        <ul className="space-y-2">
          {/* 月ごとの夢リンクを表示 */}
            {Object.entries(groupedDreams).map(([yearMonth, dreams]) => (
              <li key={yearMonth}>
                <Link href={`/dream/month/${yearMonth}`} className="text-blue-500 hover:underline">
                  {new Date(dreams[0].created_at).toLocaleString('ja-JP', { year: 'numeric', month: 'long' })}の夢
                </Link>
              </li>
            ))}
        </ul>
      </aside>
    </div>
  );
}