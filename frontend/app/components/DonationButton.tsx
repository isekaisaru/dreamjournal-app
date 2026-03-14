"use client";

import { useState } from "react";

type DonationButtonProps = {
  label?: string;
};

export default function DonationButton({
  label = "500円で応援する",
}: DonationButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDonation = async () => {
    setLoading(true);
    setError(null);

    try {
      // Next.jsのRoute Handlerを経由してバックエンドにリクエスト
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("決済の準備に失敗しました");
      }

      const data = await response.json();

      // Stripeの決済画面にリダイレクト
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("決済URLが取得できませんでした");
      }
    } catch (err) {
      console.error("Donation error:", err);
      setError(
        err instanceof Error ? err.message : "予期しないエラーが発生しました"
      );
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleDonation}
        disabled={loading}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "準備中..." : label}
      </button>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}
