"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { confirmPasswordReset, ApiError } from "@/lib/apiClient";

const defaultResetError =
  "うまく へんこうできなかったよ。もういちど ためしてね。";
const invalidTokenError =
  "リンクが正しくないみたい。もう一度メールのリンクを確認してね。";

export default function PasswordResetPage() {
  const params = useParams();
  const rawToken = params?.token;
  const token = typeof rawToken === "string" ? rawToken : "";

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (isLoading) return;

    if (!token) {
      setError(invalidTokenError);
      return;
    }
    if (!password || !passwordConfirmation) {
      setError("まだ はいっていない ところが あるよ。");
      return;
    }
    if (password.length < 8) {
      setError("パスワードは 8もじ いじょうで いれてね。");
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("パスワードに えいじ と すうじ を いれてね。");
      return;
    }
    if (password !== passwordConfirmation) {
      setError("パスワードが ちがっているみたい。もういちど みてみよう。");
      return;
    }

    setIsLoading(true);

    try {
      await confirmPasswordReset(token, {
        password,
        password_confirmation: passwordConfirmation,
      });
      setSuccessMessage(
        "パスワードを変更しました。新しいパスワードでログインしてください。"
      );
      setPassword("");
      setPasswordConfirmation("");
    } catch (err) {
      if (err instanceof ApiError && err.message) {
        setError(err.message);
      } else {
        setError(defaultResetError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground px-4 sm:px-6 lg:px-8">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-card p-6 sm:p-8 md:p-10 rounded-lg shadow-lg w-full max-w-md border border-border"
      >
        <h2 className="text-2xl md:text-3xl font-semibold mb-4 md:mb-6 text-center text-card-foreground">
          新しいパスワードを設定
        </h2>

        {successMessage ? (
          <>
            <p className="text-green-600 text-center" aria-live="polite">
              {successMessage}
            </p>
            <div className="mt-6 text-center text-sm">
              <Link
                href="/login"
                className="font-medium text-primary hover:underline"
              >
                ログイン画面へ
              </Link>
            </div>
          </>
        ) : (
          <>
            {!token && (
              <p
                className="text-destructive text-center mb-4"
                aria-live="assertive"
              >
                {invalidTokenError}
              </p>
            )}
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="reset-password"
                  className="mb-2 block text-sm font-medium text-card-foreground"
                >
                  新しいパスワード
                </label>
                <div className="relative">
                  <input
                    id="reset-password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8もじ いじょう"
                    aria-describedby="password-hint"
                    autoComplete="new-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    aria-required="true"
                    aria-invalid={error ? "true" : "false"}
                    className="w-full px-4 py-2 pr-12 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "パスワードを隠す" : "パスワードを表示"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  >
                    {showPassword ? "🙈" : "👁"}
                  </button>
                </div>
                {password.length > 0 ? (
                  <ul
                    id="password-hint"
                    className="mt-2 ml-1 space-y-1 text-xs"
                    aria-label="パスワードの条件"
                  >
                    {[
                      { ok: password.length >= 8, label: "8もじ いじょう" },
                      {
                        ok: /[a-zA-Z]/.test(password),
                        label: "えいじ（a〜z）を ふくむ",
                      },
                      {
                        ok: /[0-9]/.test(password),
                        label: "すうじ（0〜9）を ふくむ",
                      },
                    ].map(({ ok, label }) => (
                      <li
                        key={label}
                        className={`flex items-center gap-1.5 transition-colors ${
                          ok ? "text-green-500" : "text-muted-foreground"
                        }`}
                      >
                        <span aria-hidden="true" className="font-bold">
                          {ok ? "✓" : "○"}
                        </span>
                        {label}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p
                    id="password-hint"
                    className="text-xs text-muted-foreground mt-1 ml-1"
                  >
                    8文字以上・英字と数字をそれぞれ含む
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="reset-password-confirmation"
                  className="mb-2 block text-sm font-medium text-card-foreground"
                >
                  新しいパスワード（確認）
                </label>
                <div className="relative">
                  <input
                    id="reset-password-confirmation"
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
                    aria-label={
                      showConfirmPassword
                        ? "パスワード確認を隠す"
                        : "パスワード確認を表示"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  >
                    {showConfirmPassword ? "🙈" : "👁"}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || !token}
                className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring active:bg-primary/80 transition-colors duration-200 ease-in-out disabled:opacity-50"
              >
                {isLoading ? "へんこう中..." : "パスワードを変更する"}
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
            <div className="mt-6 text-center text-sm">
              <Link
                href="/login"
                className="font-medium text-primary hover:underline"
              >
                ログイン画面へ戻る
              </Link>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
