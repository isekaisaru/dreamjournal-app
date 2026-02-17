"use client";

import { useState } from "react";

export default function DonationButton() {
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
    <div className="donation-container">
      <button
        onClick={handleDonation}
        disabled={loading}
        className="donation-button"
      >
        {loading ? "準備中..." : "💝 500円で応援する"}
      </button>

      {error && <p className="error-message">{error}</p>}

      <style jsx>{`
        .donation-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .donation-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 1rem 2rem;
          font-size: 1.1rem;
          font-weight: bold;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .donation-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
        }

        .donation-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-message {
          color: #e53e3e;
          font-size: 0.9rem;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
