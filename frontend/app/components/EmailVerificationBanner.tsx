"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { resendVerificationEmail } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

type SendState = "idle" | "sending" | "sent";

// backend の User::EMAIL_VERIFICATION_RESEND_INTERVAL（5分）と揃える。
// ここを実際より短く書くと「もう送れます」と嘘をつくことになり、
// 押しても429で弾かれる、という分かりにくい状態を作ってしまう。
export const RESEND_COOLDOWN_SECONDS = 5 * 60;

/**
 * 再送できるようになる時刻の保存先。
 * バナーは /home・/dream/new・/dream/[id] の3か所にあり、画面を移動するたびに
 * 作り直される。コンポーネント内の state だけで持つと、移動した瞬間に
 * 「もう送れます」の顔に戻ってしまい、押すと429で弾かれる。
 * サーバー側のクールダウンはユーザー単位なので、キーもユーザー単位にする。
 */
export const resendDeadlineStorageKey = (userId?: string) =>
  `yumetree:verification-resend-until:${userId ?? "anonymous"}`;

/**
 * メールアドレスを伏せ字にする（例: teruo@gmail.com → te***@gmail.com）。
 * どのアドレス宛に送ったかは確認できるが、肩越しに全部は読まれないようにする。
 */
export function maskEmail(email: string): string {
  const atIndex = email.lastIndexOf("@");
  if (atIndex <= 0) return email;

  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex);
  const head = local.slice(0, 2);
  return `${head}${"*".repeat(Math.max(local.length - head.length, 1))}${domain}`;
}

/** 残り時間を子どもにも読める形にする（例: 4ふん05びょう / 42びょう）。 */
export function formatRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes > 0) {
    return `${minutes}ふん${rest.toString().padStart(2, "0")}びょう`;
  }
  return `${rest}びょう`;
}

type EmailVerificationBannerProps = {
  // AI分析や画像生成がゲートで拒否された場面など、文脈に合わせて文言を差し替える
  title?: string;
  description?: string;
};

/**
 * メールアドレス未確認ユーザー向けのお知らせバナー。
 * 確認メールの再送ボタンを備える（backend側で5分間隔の再送制限あり）。
 *
 * 「押したあと何が起きたのか分からない」状態を作らないよう、
 * 送信中・送信結果・次に送れるまでの残り時間をすべて画面に出し、
 * スクリーンリーダーにも role="status" で伝える。
 */
export default function EmailVerificationBanner({
  title = "メールアドレスの かくにんが まだだよ",
  description = "とどいた メールの リンクを ひらいて、かくにんを かんりょうしてね。",
}: EmailVerificationBannerProps) {
  const { user } = useAuth();
  const [state, setState] = useState<SendState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // 再送できるようになる時刻（epoch ms）。残り秒数ではなく時刻で持つ。
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  const storageKey = resendDeadlineStorageKey(user?.id);

  // 画面を移動して作り直されても、前に送った時刻を引き継ぐ。
  useEffect(() => {
    const stored = Number(window.localStorage.getItem(storageKey));
    if (Number.isFinite(stored) && stored > Date.now()) {
      setDeadline(stored);
      setNow(Date.now());
    }
  }, [storageKey]);

  // 残り時間は必ず実時間（Date.now）から計算する。
  // 1秒ずつ引き算すると、タブが止まっている間はカウントが進まず、
  // サーバーが再送を許可した後もボタンが無効のままになる。
  useEffect(() => {
    if (deadline === null) return;

    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= deadline) {
        setDeadline(null);
        window.localStorage.removeItem(storageKey);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline, storageKey]);

  const handleResend = async () => {
    setState("sending");
    setErrorMessage(null);
    try {
      await resendVerificationEmail();
      setState("sent");
      const until = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
      window.localStorage.setItem(storageKey, String(until));
      setDeadline(until);
      setNow(Date.now());
    } catch (err) {
      setState("idle");
      setErrorMessage(
        err instanceof ApiError && err.message
          ? err.message
          : "かくにんメールを おくれなかったよ。もういちど ためしてね。"
      );
    }
  };

  const isSending = state === "sending";
  const remaining =
    deadline === null ? 0 : Math.max(Math.ceil((deadline - now) / 1000), 0);
  const isCoolingDown = remaining > 0;
  const maskedEmail = user?.email ? maskEmail(user.email) : null;

  return (
    <div
      role="region"
      aria-label="メールアドレス確認のお知らせ"
      className="mb-4 w-full rounded-2xl border border-primary/30 bg-primary/5 p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <Mail size={16} className="text-primary" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">{title}</p>
      </div>

      <p className="text-sm text-muted-foreground mb-3">{description}</p>

      {/* 送信結果とエラーは、目でもスクリーンリーダーでも分かるようにする */}
      <div role="status" aria-live="polite">
        {state === "sent" && (
          <div className="mb-3">
            <p className="text-sm font-bold text-primary">
              かくにんメールを おくったよ。
            </p>
            {maskedEmail && (
              <p className="mt-1 text-sm text-foreground">
                {maskedEmail} を みてね。
              </p>
            )}
            <p className="mt-2 text-sm text-muted-foreground">とどかないとき:</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
              <li>めいわくメールの フォルダを みてね</li>
              <li>メールアドレスが あっているか たしかめてね</li>
            </ul>
          </div>
        )}

        {errorMessage && (
          <p className="mb-3 text-sm text-destructive">{errorMessage}</p>
        )}
      </div>

      <button
        type="button"
        onClick={handleResend}
        disabled={isSending || isCoolingDown}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {isSending
          ? "おくっているよ…"
          : isCoolingDown
            ? `あと ${formatRemaining(remaining)} で おくれるよ`
            : "かくにんメールを もういちど おくる"}
      </button>
    </div>
  );
}
