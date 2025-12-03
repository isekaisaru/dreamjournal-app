"use client";

import DreamForm from "../../components/DreamForm";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import Loading from "../../loading";
import { createDream } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import { DreamInput } from "@/app/types";

export default function NewDreamPage() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  if (isLoggedIn === null) {
    return <Loading />;
  }

  const handleCreateSubmit = async (formData: DreamInput) => {
    if (!isLoggedIn) {
      alert("ログインが必要です。");
      router.push("/login");
      return;
    }

    setIsSaving(true);
    try {
      await createDream(formData);
      toast.success("夢を保存しました！");
      router.push("/home");
    } catch (error) {
      console.error("Failed to save dream:", error);
      toast.error("保存に失敗しました。");
    } finally {
      setIsSaving(false);
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
      <DreamForm onSubmit={handleCreateSubmit} isLoading={isSaving} />
    </div>
  );
}
