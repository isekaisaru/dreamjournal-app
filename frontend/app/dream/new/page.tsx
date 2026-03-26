"use client";

import DreamForm from "../../components/DreamForm";
import MorpheusSmall from "../../components/MorpheusSmall";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useLayoutEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import Loading from "../../loading";
import { createDream } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import { DreamInput } from "@/app/types";
import { triggerDreamConfetti } from "@/lib/confetti";

export default function NewDreamPage() {
  const router = useRouter();
  const { authStatus } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [isDraftChecked, setIsDraftChecked] = useState(false);

  useLayoutEffect(() => {
    setHasDraft(!!sessionStorage.getItem("dream_draft_data"));
    setIsDraftChecked(true);
  }, []);

  if (authStatus === "checking") {
    return <Loading />;
  }

  const handleCreateSubmit = async (formData: DreamInput) => {
    if (authStatus === "unauthenticated") {
      alert("この機能はログイン後に利用できます。");
      router.push("/login");
      return;
    }

    setIsSaving(true);
    try {
      await createDream(formData);
      triggerDreamConfetti();
      toast.success("夢を保存しました！");
      router.push("/home");
    } catch (error) {
      console.error("Failed to save dream:", error);
      toast.error("保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  };

  if (authStatus === "unauthenticated") {
    return (
      <div className="min-h-screen px-4 py-8 md:px-12">
        <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 shadow-lg md:p-8">
          {/* 未ログインユーザーへのモルペウスメッセージ */}
          <MorpheusSmall
            message="ゆめを のこすには、ログインが ひつようだよ。いっしょに はじめよう！"
            className="mb-6"
          />
          <h1 className="text-2xl font-bold text-card-foreground">
            新しい夢を記録
          </h1>
          <p className="mt-3 text-muted-foreground">
            この機能はログイン後に利用できます。
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            アカウントをお持ちの方はログイン、初めての方は無料登録から始めてください。
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              ログイン
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 font-medium text-foreground transition-colors hover:bg-muted"
            >
              新規無料登録
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 md:px-12 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">あたらしい ゆめを かく</h1>

      {/* ドラフト復元バナー（録音データがある場合のみ表示） */}
      {!isDraftChecked ? (
        <div className="mb-6 h-[72px]" aria-hidden="true" />
      ) : hasDraft ? (
        <div className="mb-6">
          <MorpheusSmall
            title="まえの つづきが あるよ！"
            message="モルペウスが きいた おはなしを かわりに かいておいたよ。まちがってたら なおしてね🔮"
          />
        </div>
      ) : (
        /* 通常時の励ましメッセージ */
        <div className="mb-6">
          <MorpheusSmall
            message="どんな ゆめを みたの？おもいだせる だけ おしえてね！"
            size="sm"
          />
        </div>
      )}

      <DreamForm onSubmit={handleCreateSubmit} isLoading={isSaving} />
    </div>
  );
}
