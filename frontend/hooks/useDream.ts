import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Dream } from "../app/types";
import useAuth from "./useAuth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface DreamInput {
  title: string;
  description: string;
  content?: string;
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
      const response = await axios.get(`${API_URL}/dreams/${numericId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      const response = await axios.get(`${API_URL}/dreams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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


  
  const createDream = async (dreamData: DreamInput) => {
    const token = await getValidAccessToken();
    if (!token) {
      setError("ログインが必要です");
      return;
    }
    setError(null);
    setIsUpdating(true);
    try {
      const response = await axios.post(
        `${API_URL}/dreams`,
        { dream: dreamData },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      router.push("/home");
    } catch (err) {
       console.error("Create dream error:", err);
       let message = "夢の作成に失敗しました";
       if (axios.isAxiosError(err) && err.response?.data?.error) {
           const backendError = err.response.data.error;
           message = Array.isArray(backendError) ? backendError.join(', ') : backendError;
       }
       setError(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const updateDream = async (dreamData: DreamInput) => {
    const numericId = id ? parseInt(id, 10) : null;
    if (!numericId) return;

    const token = await getValidAccessToken();
    if (!token) {
      setError("ログインが必要です");
      return;
    }
    setError(null);
    setIsUpdating(true);
    try {
      await axios.put(
        `${API_URL}/dreams/${numericId}`,
        { dream: dreamData },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchDreamDetail();
      console.log("夢が正常に更新されました");
    } catch (err) {
      console.error("Update dream error:", err);
       let message = "夢の更新に失敗しました";
       if (axios.isAxiosError(err) && err.response?.data?.error) {
           const backendError = err.response.data.error;
           message = Array.isArray(backendError) ? backendError.join(', ') : backendError;
       }
      setError(message);
    } finally {
      setIsUpdating(false);
    }
  };


  const deleteDream = async (deleteId: number) => {
    const token = await getValidAccessToken();
    if (!token) {
      setError("ログインが必要です");
      return;
    }
    setError(null);
    try {
      await axios.delete(`${API_URL}/dreams/${deleteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const currentNumericId = id ? parseInt(id, 10) : null;
      if (currentNumericId && currentNumericId === deleteId) {
          router.push("/home");
      } else {
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
    }
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
