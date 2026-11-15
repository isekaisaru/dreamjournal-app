"use client";

import { useState } from "react";
import MorpheusSmall from "@/app/components/MorpheusSmall";
import EmailVerificationBanner from "@/app/components/EmailVerificationBanner";

export default function DonationPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailVerificationRequired, setEmailVerificationRequired] =
    useState(false);

  const handleCheckout = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setEmailVerificationRequired(false);

    try {
      const response = await fetch("/api/checkout", { method: "POST" });
      const data = await response.json().catch(() => null);

      // メール未確認（backend の require_verified_email）は汎用エラーではなく確認の案内を出す
      if (
        response.status === 403 &&
        data?.email_verification_required === true
      ) {
        setEmailVerificationRequired(true);
        setIsLoading(false);
        return;
      }

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto max-w-2xl px-4 py-16">
        <section className="rounded-2xl border border-border/60 bg-card/70 p-8 text-center shadow-sm backdrop-blur-sm">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            YumeTreeを応援する ☕
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            500円であなたの夢日記を応援できます
          </p>

          {/* モルペウスのメッセージ */}
          <div className="mt-6 text-left">
            <MorpheusSmall
              title="ありがとう！✨"
              message="きみが おうえん してくれると、ゆめの せかいが もっと ひろがるよ。モルペウスも うれしい！"
            />
          </div>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={isLoading}
            className="mt-8 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "準備中..." : "500円で応援する"}
          </button>

          {emailVerificationRequired && (
            <div className="mt-6 text-left">
              <EmailVerificationBanner
                title="おうえんするには メールの かくにんが ひつようだよ"
                description="とどいた メールの リンクを ひらいてから、もういちど ためしてみてね。"
              />
            </div>
          )}

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
