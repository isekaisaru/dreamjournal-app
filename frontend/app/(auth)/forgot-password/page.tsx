"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (isLoading) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("メールアドレスを入力してください。");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("有効なメールアドレスを入力してください。");
      return;
    }

    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${apiUrl}/password_resets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message =
          errorData?.error || "リクエストの処理中にエラーが発生しました。";
        throw new Error(message);
      }

      setSuccessMessage(
        "パスワードリセットの手順をメールで送信しました。メールをご確認ください。"
      );
      setEmail("");
    } catch (err: any) {
      setError(err.message || "リクエストの処理中にエラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground px-4 sm:px-6 lg:px-8">
      <form
        onSubmit={handleSubmit}
        className="bg-card p-6 sm:p-8 md:p-10 rounded-lg shadow-lg w-full max-w-md border border-border"
      >
        <h2 className="text-2xl md:text-3xl font-semibold mb-4 md:mb-6 text-center text-card-foreground">
          パスワードのリセット
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-6">
          ご登録のメールアドレス宛にパスワードリセット用のリンクを送信します。
        </p>
        <div className="space-y-4">
          <input
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="メールアドレス"
            autoComplete="email"
            required
            aria-label="メールアドレス"
            aria-required="true"
            aria-invalid={error ? "true" : "false"}
            className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring active:bg-primary/80 transition-colors duration-200 ease-in-out disabled:opacity-50"
          >
            {isLoading ? "送信中..." : "リセットリンクを送信"}
          </button>
        </div>
        {error && (
          <p
            className="text-destructive mt-4 text-center"
            aria-live="assertive"
          >
            {error}
          </p>
        )}
        {successMessage && (
          <p className="text-green-600 mt-4 text-center" aria-live="polite">
            {successMessage}
          </p>
        )}
        <div className="mt-6 text-center text-sm">
          <p className="text-muted-foreground">ログインページに戻りますか？</p>
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            ログイン画面へ戻る
          </Link>
        </div>
      </form>
    </div>
  );
}
