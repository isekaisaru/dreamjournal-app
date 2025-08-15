"use client";

import React, { useState, useEffect } from "react";
import { clientLogin } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, error: authError } = useAuth();

  useEffect(() => {
    if (authError) {
      setPageError(authError);
    }
  }, [authError]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPageError("");
    setIsLoading(true);
    if (!email || !password) {
      setPageError("すべてのフィールドを入力してください。");
      setIsLoading(false);
      return;
    }
    try {
      // 以前: 汎用のapiClient.postを使っていました。
      // 今回: ログイン専用の `clientLogin` 関数を呼び出します。コードが何をしたいのか分かりやすくなりますね！
      const { user } = await clientLogin({ email, password });
      // 成功したら、取得したユーザー情報でログイン処理を呼び出します。
      login(user);
    } catch (apiError: any) {
      console.error("ログインAPI呼び出しエラー:", apiError);
      // 以前: エラーメッセージは深い階層にありました (apiError.response.data.error)。
      // 今回: 新しいapiFetch関数のおかげで、エラーメッセージが apiError.message に直接入っています。シンプル！
      setPageError(
        apiError.message || "ログインに失敗しました。もう一度お試しください。"
      );
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
        <h2 className="text-2xl md:text-3xl font-semibold  mb-4 md:mb-6 text-center text-card-foreground">
          ログイン
        </h2>
        <div className="space-y-4">
          <input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="メールアドレス"
            autoComplete="email"
            required
            aria-label="メールアドレス"
            aria-required="true"
            className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワード"
            autoComplete="current-password"
            required
            aria-label="パスワード"
            aria-required="true"
            aria-invalid={pageError ? "true" : "false"}
            className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring active:bg-primary/80 transition-colors duration-200 ease-in-out disabled:opacity-50"
          >
            {isLoading ? "ログイン中..." : "ログイン"} {}
          </button>
        </div>
        {pageError && (
          <p className="text-destructive mt-4 text-center">{pageError}</p>
        )}
      </form>
    </div>
  );
}
