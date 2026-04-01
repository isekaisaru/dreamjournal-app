"use client";

import { useState } from "react";
import Link from "next/link";
import MorpheusSmall from "@/app/components/MorpheusSmall";
import { useAuth } from "@/context/AuthContext";

export default function SubscriptionPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "premium" }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.url) {
        throw new Error("決済ページの準備に失敗しました。");
      }

      window.location.assign(data.url);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "エラーが発生しました。"
      );
      setIsLoading(false);
    }
  };

  // すでにプレミアム会員の場合
  if (user?.premium) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="container mx-auto max-w-2xl px-4 py-16">
          <section className="rounded-2xl border border-border/60 bg-card/70 p-8 text-center shadow-sm backdrop-blur-sm">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              プレミアム会員です ✨
            </h1>
            <p className="mt-4 text-base text-muted-foreground">
              すべての機能をお使いいただけます
            </p>
            <div className="mt-6 text-left">
              <MorpheusSmall
                title="いつもありがとう！"
                message="きみが まいつき おうえん してくれているから、ゆめの せかいが どんどん ひろがっているよ！"
              />
            </div>
            <Link
              href="/home"
              className="mt-8 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              夢日記へ戻る
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto max-w-2xl px-4 py-16">
        <section className="rounded-2xl border border-border/60 bg-card/70 p-8 text-center shadow-sm backdrop-blur-sm">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            ユメログ プレミアム ✨
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            月額500円で、ユメログの全機能を使い放題
          </p>

          <div className="mt-6 text-left">
            <MorpheusSmall
              title="プレミアムにようこそ！"
              message="まいつき おうえん してくれると、もっと すてきな ゆめの せかいを つくれるよ。いっしょに ゆめを そだてよう！"
            />
          </div>

          <ul className="mt-6 space-y-2 text-left text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span> 夢のAI分析（無制限）
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span> 夢の画像生成（月30枚）
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span> 月次サマリー
            </li>
          </ul>

          <button
            type="button"
            onClick={handleSubscribe}
            disabled={isLoading}
            className="mt-8 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "準備中..." : "月額500円で始める"}
          </button>

          <p className="mt-3 text-xs text-muted-foreground">
            いつでもキャンセル可能です
          </p>

          {errorMessage && (
            <p className="mt-4 text-sm font-medium text-destructive">
              {errorMessage}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
