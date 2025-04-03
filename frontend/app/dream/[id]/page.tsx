"use client";

import DreamForm from "../../components/DreamForm";
import DeleteButton from "../../components/DeleteButton";
import { useDream } from "../../../hooks/useDream";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import axios from "axios";
import useAuth from "../../../hooks/useAuth";

export default function EditDreamPage() {
  const pathname = usePathname();
  const id = pathname.split("/").pop();
  const { dream, error } = useDream(id as string);
  const router = useRouter();
  const { getValidAccessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const updateDream = async (updatedData: {
    title: string;
    description: string;
  }) => {
    setIsLoading(true);
    try {
      const token = await getValidAccessToken();
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/dreams/${id}`,
        updatedData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      router.push("/home");
    } catch (error) {
      console.error("夢の更新に失敗しました:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!dream) return <p>読み込み中...</p>;
  if (error) return <p className="text-red-500">エラー: {error}</p>;

  return (
    <div className="min-h-screen py-8 px-4 md:px-12">
      <h1 className="text-2xl font-bold mb-4">夢を編集</h1>
      <DreamForm
        initialData={dream}
        onSubmit={updateDream}
        isLoading={isLoading}
      />

      {dream && (
        <div className="mt-6 flex justify-center">
          <DeleteButton id={dream.id} />
        </div>
      )}
    </div>
  );
}
