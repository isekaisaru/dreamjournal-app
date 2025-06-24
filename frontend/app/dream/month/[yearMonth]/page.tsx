"use client";

import React from "react";
import { useParams } from "next/navigation"; // useRouterを使用
import axios from "axios";
import { useEffect, useState, useCallback } from "react";
import { Dream } from "@/app/types";
import { useAuth } from "../../../../context/AuthContext";
import Loading from "../../../loading";


export default function DreamByMonthPage() {
  const params = useParams();
  const yearMonth = params.yearMonth; // URLのパラメータからyearMonthを取得
  const [dreams, setDreams] = useState<Dream[]>([]); // 夢データを保存するための変数
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // エラーメッセージの状態管理
  const { isLoggedIn, getValidAccessToken } = useAuth();
  const fetchDreamsByMonth = useCallback(async () => {
    if (yearMonth && isLoggedIn) {
      const token = await getValidAccessToken();
      if (!token) {
        setErrorMessage("認証されていません。");
        return;
      }

      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/dreams/month/${yearMonth}`,
          {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
        );
        setDreams(response.data);
        setErrorMessage(null);
      } catch (error) {
        console.error("Error fetching dreams by month:", error);
        setErrorMessage("夢の取得に失敗しました");
      }
    }
  }, [yearMonth, isLoggedIn, getValidAccessToken]);

  useEffect(() => {
    if (isLoggedIn === true) {
      fetchDreamsByMonth();
    }
  }, [isLoggedIn, fetchDreamsByMonth]);

  if (isLoggedIn === null) {
    return <Loading />;
  }
  if (!isLoggedIn) {
    return <div className="container mx-auto p-5 bg-background text-foreground"><p>このページを表示するにはログインが必要です。</p></div>;
  }

  return (
    <div className="container mx-auto p-5 bg-background text-foreground">
      <h1 className="text-3xl md:text-4xl font-bold text-center mb-6 text-foreground">
        {yearMonth}の夢一覧
      </h1>

      {errorMessage ? (
        <p className="text-destructive text-center">{errorMessage}</p>
      ) : (
        <ul>
          {dreams.length > 0 ? (
            dreams.map((dream) => (
              <li key={dream.id} className="border-b border-border py-4">
                <h2 className="text-xl font-bold text-foreground">{dream.title}</h2>
                <p className="text-muted-foreground mt-1">{dream.content}</p>
              </li>
            ))
          ) : (
            <p className="text-muted-foreground text-center">まだこの月には夢が見つかりません。</p>
          )}
        </ul>
      )}
    </div>
  );
}
