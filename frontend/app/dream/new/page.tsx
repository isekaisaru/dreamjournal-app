"use client";

import DreamForm from "../../components/DreamForm";
import axios from "axios";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export default function NewDreamPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const createDream = async (dreamData: {
    title: string;
    description: string;
  }) => {
    setIsLoading(true);
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/dreams`, dreamData);
      router.push("/home");
    } catch (error) {
      console.error("夢の作成に失敗しました:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 md:px-12">
      <h1 className="text-2xl font-bold mb-4">新しい夢を作成</h1>
      <DreamForm onSubmit={createDream} isLoading={isLoading} />
    </div>
  );
}
