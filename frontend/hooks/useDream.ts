"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Dream } from "../app/types";
import useAuth from "./useAuth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const useDream = (id?: string) => {
  const [dream, setDream] = useState<Dream | null>(null);
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();
  const { getValidAccessToken } = useAuth();

  const fetchDreams = useCallback(async () => {
    const token = await getValidAccessToken();
    if (!token) {
      setError("ログインが必要です");
      return;
    }

    try {
      setIsLoading(true);
      console.log("認証ヘッダー:", `Bearer ${token}`);
      const response = await axios.get(`${API_URL}/dreams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDreams(response.data);
    } catch (error) {
      console.error("夢データ取得エラー:", error);
      setError("夢のデータを取得できませんでした");
    } finally {
      setIsLoading(false);
    }
  }, [getValidAccessToken]);

  const fetchDreamDetail = useCallback(async () => {
    if (!id) return;
    const token = await getValidAccessToken();
    if (!token) {
      setError("ログインが必要です");
      return;
    }
    try {
      setIsLoading(true);
      console.log("認証ヘッダー:", `Bearer ${token}`);
      const response = await axios.get(`${API_URL}/dreams/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDream(response.data);
    } catch (error) {
      console.error("エラー発生:", error);
      setError("夢の詳細データ取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [id, getValidAccessToken]);

  // 夢を作成
  const createDream = async (title: string, description: string) => {
    const token = await getValidAccessToken();
    if (!token) {
      setError("ログインが必要です");
      return;
    }
    try {
      setIsUpdating(true);
      const response = await axios.post(
        `${API_URL}/dreams`,
        { dream: { title, description } },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDreams((prev) => [...prev, response.data]);
      router.push("/home");
    } catch {
      setError("夢の作成に失敗しました");
    } finally {
      setIsUpdating(false);
    }
  };

  //  **夢を更新**
  const updateDream = async (title: string, description: string) => {
    if (!id) return;
    const token = await getValidAccessToken();
    if (!token) {
      setError("ログインが必要です");
      return;
    }
    try {
      setIsUpdating(true);
      await axios.put(
        `${API_URL}/dreams/${id}`,
        { dream: { title, description } },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDream({ title, description } as Dream);
      router.push("/home");
    } catch (error: any) {
      console.error("エラー詳細:", error.response?.data || error.message);
      setError("夢の更新に失敗しました");
    } finally {
      setIsUpdating(false);
    }
  };

  // **夢を削除**
  const deleteDream = async (id: string) => {
    const token = await getValidAccessToken();
    if (!token) {
      setError("ログインが必要です");
      return;
    }
    try {
      await axios.delete(`${API_URL}/dreams/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDreams((prev) => prev.filter((dream) => dream.id !== id));
      router.push("/home");
    } catch {
      setError("夢の削除に失敗しました");
    }
  };

  useEffect(() => {
    if (id) {
      fetchDreamDetail();
    } else {
      fetchDreams();
    }
  }, [id, fetchDreamDetail, fetchDreams]);

  return {
    dream,
    dreams,
    isLoading,
    isUpdating,
    error,
    createDream,
    updateDream,
    deleteDream,
    fetchDreams,
  };
};
