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

const defaultRegisterError =
  "うまく はじめられなかったよ。もういちど ためしてね。";

function getPasswordStrength(pw: string): { level: 1 | 2 | 3 | null; label: string; color: string } {
  if (pw.length < 8) return { level: null, label: "", color: "" };
  const hasLetter = /[a-zA-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSymbol = /[!@#$%^&*()\-_=+[\]{};':",.<>/?\\|]/.test(pw);
  if (hasLetter && hasNumber && (hasSymbol || pw.length >= 12)) {
    return { level: 3, label: "強い", color: "bg-green-500" };
  }
  if (hasLetter && hasNumber) {
    return { level: 2, label: "普通", color: "bg-yellow-400" };
  }
  return { level: 1, label: "弱い", color: "bg-red-400" };
}

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
      setError("まだ はいっていない ところが あるよ。");
      setIsLoading(false);
      return;
    }
    if (!agreedToTerms) {
      setError("はじめる まえに、きまりを たしかめてね。");
      setIsLoading(false);
      return;
    }
    if (password !== passwordConfirmation) {
      setError("パスワードが ちがっているみたい。もういちど みてみよう。");
      setIsLoading(false);
      return;
    }
    if (password.length < 8) {
      setError("パスワードは 8もじ いじょうで いれてね。");
      setIsLoading(false);
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("パスワードに えいじ と すうじ を いれてね。");
      setIsLoading(false);
      return;
    }
    // 3. メールアドレスの形式が正しいかチェックする機能
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("メールアドレスの かたちを もういちど みてみてね。");
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
      setError(defaultRegisterError);
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
          はじめる
        </h2>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="register-username"
              className="mb-2 block text-sm font-medium text-card-foreground"
            >
              ニックネーム
            </label>
            <input
              id="register-username"
              type="text"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="みんなに よばれたい なまえ"
              autoComplete="username"
              required
              aria-label="ニックネーム"
              aria-required="true"
              aria-invalid={error ? "true" : "false"}
              className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label
              htmlFor="register-email"
              className="mb-2 block text-sm font-medium text-card-foreground"
            >
              メールアドレス
            </label>
            <div className="relative">
              <input
                id="register-email"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
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
          </div>
          <div>
            <label
              htmlFor="register-password"
              className="mb-2 block text-sm font-medium text-card-foreground"
            >
              パスワード
            </label>
            <div className="relative">
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8もじ いじょう"
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
            {password.length >= 8 && (() => {
              const strength = getPasswordStrength(password);
              return strength.level ? (
                <div className="mt-2 flex items-center gap-2" aria-live="polite">
                  <div className="flex flex-1 gap-1">
                    {([1, 2, 3] as const).map((seg) => (
                      <div
                        key={seg}
                        className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                          strength.level! >= seg ? strength.color : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`text-xs font-medium ${
                    strength.level === 3 ? "text-green-500" :
                    strength.level === 2 ? "text-yellow-500" : "text-red-400"
                  }`}>{strength.label}</span>
                </div>
              ) : null;
            })()}
            {password.length > 0 ? (
              <ul id="password-hint" className="mt-2 ml-1 space-y-1 text-xs" aria-label="パスワードの条件">
                {[
                  { ok: password.length >= 8, label: "8もじ いじょう" },
                  { ok: /[a-zA-Z]/.test(password), label: "えいじ（a〜z）を ふくむ" },
                  { ok: /[0-9]/.test(password), label: "すうじ（0〜9）を ふくむ" },
                ].map(({ ok, label }) => (
                  <li key={label} className={`flex items-center gap-1.5 transition-colors ${ok ? "text-green-500" : "text-muted-foreground"}`}>
                    <span aria-hidden="true" className="font-bold">{ok ? "✓" : "○"}</span>
                    {label}
                  </li>
                ))}
              </ul>
            ) : (
              <p id="password-hint" className="text-xs text-muted-foreground mt-1 ml-1">
                8文字以上・英字と数字をそれぞれ含む
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="register-password-confirmation"
              className="mb-2 block text-sm font-medium text-card-foreground"
            >
              パスワードを もういちど
            </label>
            <div className="relative">
              <input
                id="register-password-confirmation"
                type={showConfirmPassword ? "text" : "password"}
                name="password_confirmation"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                placeholder="もういちど いれてね"
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
            {isLoading ? "じゅんび しているよ..." : "はじめる"}
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
