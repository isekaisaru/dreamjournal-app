"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

export default function Register() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login, isLoggedIn } = useAuth();

  useEffect(() => {
    if (isLoggedIn) {
      router.push("/home");
    }
  }, [isLoggedIn, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!email || !username || !password || !passwordConfirmation) {
      setError("すべてのフィールドを入力してください。");
      setIsLoading(false);
      return;
    }
    if (password !== passwordConfirmation) {
      setError("パスワードが一致しません。");
      setIsLoading(false);
      return;
    }
    if (password.length < 6) {
      setError("パスワードは6文字以上である必要があります。");
      return;
    }
    try {
      const response = await apiClient.post(
        `/register`,
        {
          user: {
            email,
            username,
            password,
            password_confirmation: passwordConfirmation,
          },
        }
      );

      const { user } = response.data;
      if (user) {
        login(user);
      } else {
        setError("登録後のユーザー情報取得に失敗しました。");
      }
    } catch (err: any) {
      const backendError =
        err.response?.data?.errors ||
        err.response?.data?.error ||
        "登録に失敗しました。";
      setError(
        Array.isArray(backendError) ? backendError.join(", ") : backendError
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground px-4 sm:px-6 lg:px-8">
      <form
        onSubmit={handleSubmit}
        className="bg-card p-8 rounded-lg shadow-lg w-full max-w-md border border-border"
      >
        <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-center text-card-foreground">
          ユーザー登録
        </h2>
        <div className="space-y-4">
          <input
            type="text"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ユーザー名"
            autoComplete="username"
            required
            aria-label="ユーザー名"
            aria-required="true"
            aria-invalid={error ? "true" : "false"}
            className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="メールアドレス"
            autoComplete="email"
            required
            aria-required="true"
            aria-invalid={error ? "true" : "false"}
            className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワード"
            autoComplete="new-password"
            required
            className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="password"
            name="password_confirmation"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            placeholder="パスワード確認"
            autoComplete="new-password"
            required
            aria-label="パスワード確認"
            aria-required="true"
            aria-invalid={error ? "true" : "false"}
            className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring active:bg-primary/80 transition-colors duration-200 ease-in-out disabled:opacity-50"
          >
            {isLoading ? "登録中..." : "登録"}
          </button>
        </div>
        {error && <p className="text-destructive mt-4 text-center">{error}</p>}
      </form>
    </div>
  );
}
