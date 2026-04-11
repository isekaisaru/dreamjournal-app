"use client";

import Link from "next/link";
import React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { clientRegister } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import MorpheusSmall from "@/app/components/MorpheusSmall";

const hiddenEmailStyle = {
  WebkitTextSecurity: "disc",
  textSecurity: "disc",
} as React.CSSProperties;

export default function Register() {
  const [email, setEmail] = useState("");
  const [showEmail, setShowEmail] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, authStatus } = useAuth();
  const router = useRouter();

  // 1. 既にログインしているユーザーをホームページに案内する機能
  useEffect(() => {
    if (authStatus === "authenticated") {
      router.push("/home");
    }
  }, [authStatus, router]);

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
    if (!agreedToTerms) {
      setError("利用規約とプライバシーポリシーに同意してください。");
      setIsLoading(false);
      return;
    }
    if (password !== passwordConfirmation) {
      setError("パスワードが一致しません。");
      setIsLoading(false);
      return;
    }
    if (password.length < 8) {
      setError("パスワードは8文字以上である必要があります。");
      setIsLoading(false);
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("パスワードは英字と数字をそれぞれ1文字以上含む必要があります。");
      setIsLoading(false);
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
      <div className="w-full max-w-md">
        <MorpheusSmall
          message="はじめまして！いっしょにゆめを記録しよう"
          className="mb-4"
        />
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
          <div className="relative">
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレス"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              aria-required="true"
              aria-describedby="error-message"
              style={showEmail ? undefined : hiddenEmailStyle}
              className="w-full px-4 py-2 pr-12 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => setShowEmail((v) => !v)}
              aria-label={showEmail ? "メールアドレスを隠す" : "メールアドレスを表示"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              {showEmail ? "🙈" : "👁"}
            </button>
          </div>
          <div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワード"
                aria-describedby="password-hint error-message"
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                className="w-full px-4 py-2 pr-12 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
            <p id="password-hint" className="text-xs text-muted-foreground mt-1 ml-1">
              8文字以上・英字と数字をそれぞれ含む
            </p>
          </div>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="password_confirmation"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              placeholder="パスワード確認"
              autoComplete="new-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              aria-label="パスワード確認"
              aria-required="true"
              aria-invalid={error ? "true" : "false"}
              className="w-full px-4 py-2 pr-12 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              aria-label={showConfirmPassword ? "パスワード確認を隠す" : "パスワード確認を表示"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              {showConfirmPassword ? "🙈" : "👁"}
            </button>
          </div>

          {/* 利用規約への同意 */}
          <div className="bg-muted/30 p-4 rounded-lg border border-border">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-input text-primary focus:ring-2 focus:ring-ring cursor-pointer"
                aria-label="利用規約とプライバシーポリシーに同意する"
              />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                <Link
                  href="/terms"
                  target="_blank"
                  className="text-primary hover:underline font-medium"
                >
                  利用規約
                </Link>
                と
                <Link
                  href="/privacy"
                  target="_blank"
                  className="text-primary hover:underline font-medium"
                >
                  プライバシーポリシー
                </Link>
                に同意します
              </span>
            </label>
            <p className="text-xs text-muted-foreground mt-2 ml-8">
              ※ 13歳未満の方は、保護者の方と一緒に確認してください
            </p>
          </div>

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
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            ログインする
          </Link>
        </div>
      </form>
      </div>
    </div>
  );
}
