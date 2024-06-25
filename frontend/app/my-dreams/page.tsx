"use client"
// 必要なReactのフックとaxiosのインポート
import { useEffect, useState } from "react";
import axios from "axios";
import DreamList from "@/components/DreamList";
import { Dream } from "../types";

export default function MyDreams() {
  // ユーザーの夢を格納するためのステートを初期化
  const [dreams, setDreams] = useState<Dream[]>([]);
  // コンポーネントがマウントされたときに実行されるuseEffectフック
  useEffect(() => {
    // 非同期関数を定義してデータを取得
    const fetchDreams = async () => {
      try {
       // APIリクエストを送信し、認証トークンをヘッダーに追加
        const response = await axios.get("http://localhost:3001/my_dreams", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        // 取得したデータをstateにセット
        setDreams(response.data);
      } catch (error) {
        // エラーハンドリング
        console.error("Error fetching dreams:", error);
      }
    };
   // fetchDreams関数を呼び出し
   fetchDreams();
  }, []);

  return (
    <div className="md:flex">
      <section className="w-full md:w-2/3 flex flex-col items-center px-3 md:px-6">
        <DreamList dreams={dreams} />
      </section>
    </div>
  );
}