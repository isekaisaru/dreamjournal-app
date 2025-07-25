"use client";

import DreamForm from "../../components/DreamForm";
import { useDream, DreamInput } from "../../../hooks/useDream";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import Loading from "../../loading";

export default function NewDreamPage() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();

  const { createDream: hookCreateDream, isUpdating, error } = useDream();

  useEffect(() => {
    if (error) {
      alert(`エラー: ${error}`);
      console.error("Error from useDream:", error);
    }
  }, [error]);

  if (isLoggedIn === null) {
    return <Loading />;
  }

  const handleCreateSubmit = async (formData: DreamInput) => {
    if (!isLoggedIn) {
      alert("ログインが必要です。");
      router.push("/login");
      return;
    }
    const success = await hookCreateDream(formData);
    if (success) {
      router.push("/home");
    } else {
      console.error("夢の作成に失敗しました。 エラーメッセージ:", error);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen py-8 px-4 md:px-12 max-w-3xl mx-auto">
        <p>このページを表示するにはログインが必要です。</p>
      </div>
    );
  }
  return (
    <div className="min-h-screen py-8 px-4 md:px-12 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">新しい夢を記録</h1>
      <DreamForm onSubmit={handleCreateSubmit} isLoading={isUpdating} />
    </div>
  );
}
