"use client";

import { useEffect, useState } from "react";
import DreamList from "@/components/DreamList";
import SearchBar from "@/components/SearchBar";
import Link from "next/link";
import axios from "axios";
import { Dream } from "@/app/types";

/**
 * HomePageコンポーネント
 * - 認証されたユーザーが見るホームページ
 */
export default function HomePage() {
  const [dreams, setDreams] = useState<Dream[]>([]); // 夢データの状態管理
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // エラーメッセージの状態管理

 // 認証トークンを使用して夢データを取得する関数
  const fetchDreams = async (query = '', startDate = '', endDate = '') => {
    try {
      const token = localStorage.getItem('token'); // ローカルストレージからJWTトークンを取得
      if (!token) {
        throw new Error('Token not found'); // トークンがない場合はエラーをスロー
      }
      // 夢データ取得APIエンドポイントにリクエストを送信
      const response = await axios.get('http://localhost:3001/dreams', {
        params: { query, start_date: startDate, end_date: endDate }, // クエリパラメータを設定
        headers: {
          Authorization: `Bearer ${token}`, // 認証ヘッダーを設定
        },
      });
      // レスポンスデータから夢データを取得し、状態を更新
      setDreams(response.data);
    } catch (error:any) {
      console.error('Error fetching dreams:', error);
      setErrorMessage('夢のデータの取得に失敗しました。認証エラーです。');
    }
  };

  useEffect(() => {
    fetchDreams(); // コンポーネントがマウントされたときに夢データを取得
  }, []);

  return (
    <div className="md:flex">
      <section className="w-full md:w-2/3 flex flex-col items-center px-3 md:px-6">
        <SearchBar onSearch={fetchDreams}/> {/* 検索バー */}

        {/* エラーメッセージを表示する部分 */}
        {errorMessage && (
          <div className="text-red-500 mb-4">
            {errorMessage}
          </div>
        )}

        {/* 夢リストコンポーネント */}
        <DreamList dreams={dreams} /> {/* 夢データをリストして表示 */}
      </section>

      <aside className="w-full md:w-1/3 flex flex-col items-center px-3 md:px-6 mt-4 md:mt-0">
        <div className="bg-white shadow-md rounded p-4 mb-6">
          <h3 className="font-bold text-gray-600 mb-2">前に見た夢</h3>
          <p className="text-gray-600">
            前に見た夢を振り返ってみましょう！
          </p>
        </div>
        <ul className="space-y-2">
          <li>
            <Link href="/dream/1" className="text-gray-500 hover:underline">
              2024年1月の夢
            </Link>
          </li>
          <li>
            <Link href="/dream/2" className="text-blue-500 hover:underline">
              2024年2月の夢
            </Link>
          </li>
          <li>
            <Link href="/dream/3" className="text-blue-500 hover:underline">
              2024年3月の夢
            </Link>
          </li>
        </ul>
      </aside>
    </div>
  );
}