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
interface User {
  id: number;
  email: string;
  username: string;
}

export default function HomePage() {
  const [dreams, setDreams] = useState<Dream[]>([]); // 夢データの状態管理
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // エラーメッセージの状態管理
  const [user, setUser] = useState<User | null>(null);  // ユーザー情報の状態管理

 // 認証トークンを使用して夢データとユーザー情報を取得する関数
  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token'); // ローカルストレージからJWTトークンを取得
      if (!token) {
        throw new Error('トークンがありません。'); // トークンがない場合はエラーをスロー
      }

      // ユーザー情報と夢データを取得するAPIエンドポイントにリクエストを送信
      const userResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/me`, {
        headers: {
          Authorization: `Bearer ${token}`, // 認証ヘッダーを設定
        },
      });

      setUser(userResponse.data.user); // ユーザー情報を状態に設定
    
      // 夢データ取得APIエンドポイントにリクエストを送信
      const dreamsResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/my_dreams`, {
        headers: {
          Authorization: `Bearer ${token}`, // 認証ヘッダーを設定
        },
      });
      
      setDreams(dreamsResponse.data); //夢データの状態を更新
    } catch (error: unknown) {
      console.error('Error fetching user data:', error);
      if (error instanceof Error) {
      setErrorMessage('夢のデータの取得に失敗しました。認証エラーです。');
      }
    }
  };

  useEffect(() => {
    fetchUserData(); // コンポーネントがマウントされたときにユーザー情報と夢データを取得
  }, []);

  return (
    <div className="md:flex">
      <section className="w-full md:w-2/3 flex flex-col items-center px-3 md:px-6">
        <h1 className = "text-2xl font-bold">
          {user ? `${user.username}さんの夢` : '夢'}
        </h1>
        <SearchBar onSearch={fetchUserData}/> {/* 検索バー */}

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