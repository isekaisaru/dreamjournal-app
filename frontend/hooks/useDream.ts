import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Dream } from "../app/types";
import { useAuth } from "@/context/AuthContext";
import apiClient from "../lib/apiClient";

export interface DreamInput {
  title: string;
  content?: string;
  emotion_ids?: number[];
}

export const useDream = (id?: string) => {
  const [dream, setDream] = useState<Dream | null>(null);
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();
  const { getValidAccessToken } = useAuth();

  const fetchDreamDetail = useCallback(async () => {
    const numericId = id ? parseInt(id, 10) : null;
    if (!numericId) return;

    const token = await getValidAccessToken();
    if (!token) {
      setError("ログインが必要です");
      setIsLoading(false);
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/dreams/${numericId}`);
      setDream(response.data);
    } catch (error) {
      console.error("エラー発生:", error);
      let message = "夢の詳細データ取得に失敗しました";
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        message = "指定された夢が見つかりません。";
      } else if (axios.isAxiosError(error)) {
        message = error.response?.data?.error || message;
      }
      setError(message);
      setDream(null);
    } finally {
      setIsLoading(false);
    }
  }, [id, getValidAccessToken]);

   const fetchDreams = useCallback(async () => {
    const token = await getValidAccessToken();
    if (!token) {
      setError("ログインが必要です");
      setIsLoading(false);
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/dreams`);
      setDreams(response.data);
    } catch (error) {
      console.error("夢データ取得エラー:", error);
      let message = "夢のデータを取得できませんでした";
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.error || message;
      }
      setError(message);
      setDreams([]);
    } finally {
      setIsLoading(false);
    }
  }, [getValidAccessToken]);


  const createDream = async (dreamData: DreamInput): Promise<boolean> => {
    setError(null);
    setIsUpdating(true);
    try {
      await apiClient.post(`/dreams`, { dream: dreamData });
    } catch (err) {
       console.error("Create dream error:", err);
       let message = "夢の作成に失敗しました";
       if (axios.isAxiosError(err) && err.response?.data?.error) {
           const backendError = err.response.data.error;
           message = Array.isArray(backendError) ? backendError.join(', ') : backendError;
       }
       setError(message);
       return false;
    } finally {
      setIsUpdating(false);
    }
    return true;
  };

  const updateDream = async (dreamData: DreamInput): Promise<boolean> => {
    const numericId = id ? parseInt(id, 10) : null;
    if (!numericId) {
      setError("更新対象の夢のIDがありません。");
      return false;
    }

    setError(null);
    setIsUpdating(true);
    try {
      await apiClient.put(`/dreams/${numericId}`, { dream: dreamData });
      await fetchDreamDetail();
    } catch (err) {
      console.error("Update dream error:", err);
       let message = "夢の更新に失敗しました";
       if (axios.isAxiosError(err) && err.response?.data?.error) {
           const backendError = err.response.data.error;
           message = Array.isArray(backendError) ? backendError.join(', ') : backendError;
       }
      setError(message);
      return false;
    } finally {
      setIsUpdating(false);
    }
    console.log("夢が正常に更新されました");
    return true;
  };


  const deleteDream = async (deleteId: number): Promise<boolean> => {
    setError(null);
    try {
      await apiClient.delete(`/dreams/${deleteId}`);
      const currentNumericId = id ? parseInt(id, 10) : null;
      if (!(currentNumericId && currentNumericId === deleteId)) {
          setDreams((prev) => prev.filter((d) => d.id !== deleteId));
      }
    } catch (err) {
       console.error("Delete dream error:", err);
       let message = "夢の削除に失敗しました";
       if (axios.isAxiosError(err) && err.response?.data?.error) {
           const backendError = err.response.data.error;
           message = Array.isArray(backendError) ? backendError.join(', ') : backendError;
       }
       setError(message);
       return false;
    }
    return true;
  };


  useEffect(() => {
    if (id) {
      fetchDreamDetail();
    }
  }, [id, fetchDreamDetail]);

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
