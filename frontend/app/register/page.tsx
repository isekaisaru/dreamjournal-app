"use client";

import React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";

export default function Register() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { login } = useAuth();

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
      setIsLoading(false);
      return;
    }
    try {
      console.log("Submitting registration data:", {
        email,
        username,
        password,
        password_confirmation: passwordConfirmation,
      });
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/register`,
        {
          user: {
            email,
            username,
            password,
            password_confirmation: passwordConfirmation,
          },
        }
      );
      // バックエンドから返されるアクセストークンとリフレッシュトークンを正しく取得
      const { access_token, refresh_token, user: userData } = response.data;
      
      if (access_token && refresh_token && userData) {
        console.log("Access Token received:", access_token);
        console.log("Refresh Token received:", refresh_token);
        console.log("User data received:", userData);

        await login(access_token, refresh_token, userData);
        router.push("/home?registered=true");
      } else {
        console.error("Registration response missing tokens or user data:", response.data);
        setError("登録処理中にエラーが発生しました。必要な情報がサーバーから返されませんでした。");
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.response && error.response.data) {
        const backendError = error.response.data.error || error.response.data.errors;
        setError(Array.isArray(backendError) ? backendError.join(", ") : backendError || "登録に失敗しました。");
      } else if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        setError(error.response.data.message); // 別のエラーメッセージがある場合
      } else {
        console.error("General error:", error);
        setError("登録に失敗しました。もう一度お試しください。");
      }
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
            className={`w-full py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring active:bg-primary/80 transition-colors duration-200 ease-in-out ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isLoading ? "登録中..." : "登録"}
          </button>
        </div>
        {error && <p className="text-destructive mt-4 text-center">{error}</p>}
      </form>
    </div>
  );
}
