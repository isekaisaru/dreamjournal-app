"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { resendVerificationEmail } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiClient";

type SendState = "idle" | "sending" | "sent";

/**
 * メールアドレス未確認ユーザー向けのお知らせバナー。
 * 確認メールの再送ボタンを備える（backend側で5分間隔の再送制限あり）。
 */
export default function EmailVerificationBanner() {
  const [state, setState] = useState<SendState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleResend = async () => {
    setState("sending");
    setErrorMessage(null);
    try {
      await resendVerificationEmail();
      setState("sent");
    } catch (err) {
      setState("idle");
      setErrorMessage(
        err instanceof ApiError
          ? err.message
          : "かくにんメールを おくれなかったよ。もういちど ためしてね。"
      );
    }
  };

  return (
    <div
      role="region"
      aria-label="メールアドレス確認のお知らせ"
      className="mb-4 w-full rounded-2xl border border-primary/30 bg-primary/5 p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <Mail size={16} className="text-primary" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">
          メールアドレスの かくにんが まだだよ
        </p>
      </div>

      <p className="text-sm text-muted-foreground mb-3">
        とどいた メールの リンクを ひらいて、かくにんを かんりょうしてね。
      </p>

      {state === "sent" ? (
        <p className="text-sm font-bold text-primary">
          かくにんメールを おくったよ。うけとりボックスを みてね。
        </p>
      ) : (
        <button
          type="button"
          onClick={handleResend}
          disabled={state === "sending"}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {state === "sending" ? "おくっているよ…" : "かくにんメールを もういちど おくる"}
        </button>
      )}

      {errorMessage && (
        <p className="mt-2 text-sm text-destructive">{errorMessage}</p>
      )}
    </div>
  );
}
