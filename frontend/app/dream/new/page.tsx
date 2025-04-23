"use client";

import DreamForm from "../../components/DreamForm";
import { useDream, DreamInput } from "../../../hooks/useDream";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import useAuth from "../../../hooks/useAuth";


export default function NewDreamPage() {
  const router = useRouter();

  const {
      createDream: hookCreateDream,
      isUpdating,
      error
  } = useDream();

  useEffect(() => {
    if (error) {
      alert(`エラー: ${error}`);
      console.error("Error from useDream:", error);
    }
  }, [error]);

  const handleCreateSubmit = async (formData: DreamInput) => {
    await hookCreateDream(formData);
  }

  return (
    <div className="min-h-screen py-8 px-4 md:px-12 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">新しい夢を記録</h1>
      <DreamForm onSubmit={handleCreateSubmit} isLoading={isUpdating} />
    </div>
  );
}
