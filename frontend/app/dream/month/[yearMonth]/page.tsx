"use client";

import React from "react";
import { useParams } from "next/navigation"; // useRouterを使用
import axios from "axios";
import { useEffect, useState } from "react";
import { Dream } from "@/app/types";

export default function DreamByMonthPage() {
  const params = useParams();
  const yearMonth = params.yearMonth; // URLのパラメータからyearMonthを取得
  const [dreams, setDreams] = useState<Dream[]>([]); // 夢データを保存するための変数
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // エラーメッセージの状態管理

  // ページが表記されたときに実行される部分
  useEffect(() => {
    if (yearMonth) {
      const token = localStorage.getItem("token"); // トークンを取得

      // APIを使って夢データを取得
      axios
        .get(`${process.env.NEXT_PUBLIC_API_URL}/dreams/month/${yearMonth}`, {
          headers: {
            Authorization: `Bearer ${token}`, // 認証ヘッダーを設
          },
        })
        .then((response) => {
          setDreams(response.data); //取得した夢データを状態に設定
        })
        .catch((error) => {
          console.error("Error fetching dreams by month:", error);
          setErrorMessage("夢の取得に失敗しました"); // エラーメッセージを設定
        });
    }
  }, [yearMonth]); // yearMonthが変わるたびに実行

  return (
    <div className="container mx-auto p-5">
      <h1 className="text-3xl md:text-4xl font-bold text-center mb-6">
        {yearMonth}の夢一覧
      </h1>

      {errorMessage ? (
        <p className="text-red-500">{errorMessage}</p>
      ) : (
        <ul>
          {dreams.length > 0 ? (
            dreams.map((dream) => (
              <li key={dream.id} className="border-b py-2">
                <h2 className="text-xl font-bold">{dream.title}</h2>
                <p>{dream.description}</p>
              </li>
            ))
          ) : (
            <p>まだこの月には夢が見つかりません。</p>
          )}
        </ul>
      )}
    </div>
  );
}
