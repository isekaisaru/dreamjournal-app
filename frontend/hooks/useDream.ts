"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDetailDream, updateDream } from "@/app/dreamsAPI";

interface Dream {
  id: string;
  title: string;
  description: string;
}

export const useDream = (id: string) => {
  const[dream, setDream] = useState<Dream | null>(null);
  const[error, setError] = useState("");
  const[isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  //夢の詳細データを取得
  useEffect(() => {
    let isMounted = true;

    if (!id) return;

    getDetailDream(id)
    .then((data) => {
      if (isMounted) setDream(data);
    })
    .catch(() => {
      if (isMounted) setError("夢の詳細が取得できませんでした");
    });
    return () => {
      isMounted = false;
    };
  }, [id]);

  //夢を更新

  const updateDreamData = async (newTitle: string, newDescription: string) => {
    if( newTitle.trim() === "") {
      setError("タイトルを入力してください");
      return;
    }
    if (newTitle.length > 100){
      setError("タイトルは100文字以内で入力してください");
      return;
    }
    if( newDescription.trim() === "") {
      setError("内容を入力してください");
      return;
    }
    if (newDescription.length > 1000){
      setError("内容は1000文字以内で入力してください");
      return;
    }

    setIsUpdating(true);
    setError("");

    try {
      await updateDream(id, newTitle, newDescription);
      router.push("/home");
    } catch (err) {
      console.error("Failed to update the dream:", err);
      setError("夢の編集に失敗しました");
  } finally {
    setIsUpdating(false);
  }
};

return { dream, error, isUpdating, updateDreamData };
}