"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { clientRegister } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

export default function Register() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, isLoggedIn } = useAuth();
  const router = useRouter();

  // 1. 既にログインしているユーザーをホームページに案内する機能
  useEffect(() => {
    if (isLoggedIn) {
      router.push("/home");
    }
  }, [isLoggedIn, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // 2. 入力内容のチェックを強化
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
      setIsLoading(false); // ローディング状態を解除するのを忘れない
      return;
    }
    // 3. メールアドレスの形式が正しいかチェックする機能
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("有効なメールアドレスを入力してください。");
      setIsLoading(false);
      return;
    }

    try {
      // 以前: 汎用のapiClient.postを使っていました。
      // 今回: ユーザー登録専用の `clientRegister` 関数を使います。
      const { user } = await clientRegister({
        email,
        username,
        password,
        password_confirmation: passwordConfirmation,
      });
      // 成功したら、取得したユーザー情報でログイン処理を呼び出します。
      login(user);
    } catch (err: any) {
      // 以前: エラーメッセージは err.response.data.errors など、複数の可能性がありました。
      // 今回: apiClientから来るエラーメッセージを直接表示します。シンプル！
      setError(err.message || "登録に失敗しました。");
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
            aria-describedby="error-message"
            className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワード"
            aria-describedby="error-message"
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
        {error && (
          <p
            id="error-message"
            className="text-destructive mt-4 text-center"
            aria-live="assertive"
          >
            {error}
          </p>
        )}
        {/* 4. ログインページへの案内リンク */}
        <div className="mt-6 text-center text-sm">
          <p className="text-muted-foreground">
            すでにアカウントをお持ちですか？
          </p>
          <a href="/login" className="font-medium text-primary hover:underline">
            ログインする
          </a>
        </div>
      </form>
    </div>
  );
}
