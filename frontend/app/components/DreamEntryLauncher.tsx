"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Mic, Pencil, Sparkles, Square, X } from "lucide-react";

import type { AnalysisResult } from "@/app/types";
import { useAuth } from "@/context/AuthContext";
import useVoiceRecorder from "@/hooks/useVoiceRecorder";
import { uploadAndAnalyzeAudio } from "@/lib/audioAnalysis";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

import { Button, type ButtonProps } from "./ui/button";
import { TRIAL_AUDIO_LIMIT } from "./TrialBanner";

type DreamEntryLauncherProps = {
  buttonLabel: string;
  buttonVariant?: ButtonProps["variant"];
  buttonSize?: ButtonProps["size"];
  buttonClassName?: string;
  helperText?: string;
  showSparkles?: boolean;
};

export default function DreamEntryLauncher({
  buttonLabel,
  buttonVariant = "default",
  buttonSize = "default",
  buttonClassName,
  helperText,
  showSparkles = false,
}: DreamEntryLauncherProps) {
  const router = useRouter();
  const { user, login } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "confirming" | "preparing" | "recording"
  >("idle");

  // お試しユーザー（課金前）だけ音声の残り回数を表示・制限する
  const isTrial = user?.trial_user === true && !user?.premium;
  const audioRemaining = Math.max(
    0,
    TRIAL_AUDIO_LIMIT - (user?.trial_audio_count ?? 0)
  );
  const audioLimitReached = isTrial && audioRemaining === 0;

  const handleAnalysisResult = useCallback(
    (result: AnalysisResult) => {
      toast.success(result.message || "こえを きいたよ！ ちょっと まっててね。");
      window.dispatchEvent(new Event("dream-created"));
      setIsOpen(false);
      router.refresh();
      router.push("/home");
    },
    [router]
  );

  const handleBlobReady = useCallback(
    async (blob: Blob) => {
      setIsProcessing(true);
      try {
        const result = await uploadAndAnalyzeAudio(blob);
        // お試しユーザーは録音成功で使用回数が1増える。backendの再取得を待たず
        // グローバルのuserを更新し、残り回数表示（このボタン・/homeのTrialBanner）を
        // 即座に最新化する（premiumは制限対象外なので更新しない）
        if (user && user.trial_user && !user.premium) {
          login({
            ...user,
            trial_audio_count: (user.trial_audio_count ?? 0) + 1,
          });
        }
        handleAnalysisResult(result);
      } catch (err) {
        console.error("Failed to analyze audio dream", err);
        toast.error(
          err instanceof Error
            ? err.message
            : "ちょっと つかれちゃった みたい。あとで また はなしてね。"
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [handleAnalysisResult, login, user]
  );

  const { isRecording, error, startRecording, stopRecording } =
    useVoiceRecorder({
      onBlobReady: handleBlobReady,
    });

  const closeSheet = useCallback(() => {
    if (isProcessing) return;
    // 録音中にシートを閉じるとマイクがバックグラウンドで動き続けるため、先に停止する
    if (isRecording) {
      stopRecording();
    }
    // 次に開いたときに「かくにん中」が残らないよう待機状態へ戻す
    setStatus("idle");
    setIsOpen(false);
  }, [isProcessing, isRecording, stopRecording]);

  useEffect(() => {
    if (isRecording) {
      setStatus("recording");
    } else if (!isProcessing && status === "recording") {
      setStatus("idle");
    }
  }, [isProcessing, isRecording, status]);

  useEffect(() => {
    if (error) {
      setStatus("idle");
    }
  }, [error]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSheet();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeSheet, isOpen]);

  const handleVoiceToggle = async () => {
    if (isProcessing) return;

    // 録音中なら止める
    if (status === "recording") {
      if (navigator?.vibrate) navigator.vibrate(200);
      stopRecording();
      return;
    }

    // お試しの残り回数が0なら開始させない
    if (audioLimitReached) return;

    // 1回目のタップでは録音せず、説明を見せて一拍おく
    if (status === "idle") {
      setStatus("confirming");
      return;
    }

    // 「かくにん中」からもう一度押されたら録音を始める
    if (status === "confirming") {
      if (navigator?.vibrate) navigator.vibrate(200);
      setStatus("preparing");
      try {
        await startRecording();
      } catch {
        setStatus("idle");
      }
    }
  };

  return (
    <>
      <div className="w-full">
        <Button
          type="button"
          variant={buttonVariant}
          size={buttonSize}
          onClick={() => setIsOpen(true)}
          className={cn("gap-2 rounded-full", buttonClassName)}
        >
          {showSparkles ? <Sparkles className="h-5 w-5" /> : null}
          <span>{buttonLabel}</span>
        </Button>
        {helperText ? (
          <p className="mt-2 text-sm text-muted-foreground">{helperText}</p>
        ) : null}
      </div>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[100] bg-slate-950/45 backdrop-blur-sm"
          onClick={closeSheet}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dream-entry-sheet-title"
            aria-describedby="dream-entry-sheet-description"
            className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-xl rounded-t-[2rem] border border-border bg-card px-5 pb-8 pt-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-primary">
                  まずは のこしかたを えらぼう
                </p>
                <h2
                  id="dream-entry-sheet-title"
                  className="mt-1 text-xl font-bold text-card-foreground"
                >
                  きょうの ゆめを のこす
                </h2>
                <p
                  id="dream-entry-sheet-description"
                  className="mt-2 text-sm leading-relaxed text-muted-foreground"
                >
                  ねむい あさでも だいじょうぶ。ことばでも、こえでも のこせるよ。
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={closeSheet}
                className="shrink-0 rounded-full"
                aria-label="とじる"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="mt-6 space-y-3">
              {/* ことばで かく：むらさき系のタイルで「文字」を表す */}
              <Link
                href="/dream/new"
                onClick={() => setIsOpen(false)}
                className="flex min-h-16 w-full items-center justify-between rounded-2xl border border-violet-200/70 bg-violet-50/60 px-4 py-4 text-left transition-colors hover:bg-violet-50"
              >
                <div>
                  <p className="text-base font-bold text-foreground">
                    ことばで かく
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    おもいだせる ぶんだけ、ゆっくり かけるよ
                  </p>
                </div>
                <div className="rounded-full bg-violet-100 p-3.5 text-violet-600">
                  <Pencil className="h-6 w-6" />
                </div>
              </Link>

              {/* こえで はなす：みず色系のタイルで「音声」を表す */}
              <button
                type="button"
                onClick={handleVoiceToggle}
                disabled={isProcessing || audioLimitReached}
                className={cn(
                  "flex min-h-16 w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  status === "recording"
                    ? "border-red-300 bg-red-50 text-red-700"
                    : status === "confirming"
                      ? "border-sky-400 bg-sky-100/70"
                      : "border-sky-200/70 bg-sky-50/60 hover:bg-sky-50",
                  isProcessing || audioLimitReached
                    ? "cursor-not-allowed opacity-70"
                    : ""
                )}
                aria-pressed={status === "recording"}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-bold text-foreground">
                      {status === "recording"
                        ? "こえを とめる"
                        : status === "confirming"
                          ? "はなしはじめる"
                          : "こえで はなす"}
                    </p>
                    {/* お試しユーザーには残り回数バッジを見せる */}
                    {isTrial && status !== "recording" ? (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-700">
                        のこり {audioRemaining}かい
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isProcessing
                      ? "モルペウスが まとめているよ"
                      : status === "recording"
                        ? "おわったら もういちど おしてね"
                        : status === "confirming"
                          ? "マイクを つかうよ。よういが できたら もういちど おしてね"
                          : audioLimitReached
                            ? "きょうの おためしは おしまい だよ"
                            : "ボタンを おして、そのまま はなしてみよう"}
                  </p>
                </div>
                <div
                  className={cn(
                    "relative rounded-full p-3.5",
                    status === "recording"
                      ? "bg-red-100 text-red-600"
                      : "bg-sky-100 text-sky-600"
                  )}
                >
                  {status === "recording" ? (
                    <>
                      <span className="absolute inset-0 rounded-full border border-red-300/80 animate-ping" />
                      <span className="absolute -inset-2 rounded-full border border-red-200/70 animate-[ping_1.8s_ease-out_infinite]" />
                    </>
                  ) : status === "confirming" ? (
                    <span className="absolute inset-0 rounded-full border border-sky-300/80 animate-ping" />
                  ) : null}
                  {isProcessing ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : status === "recording" ? (
                    <Square className="h-6 w-6 fill-current" />
                  ) : status === "preparing" ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Mic className="h-6 w-6" />
                  )}
                </div>
              </button>

              {/* お試しの音声が残り0回のときは本登録へ誘導する */}
              {audioLimitReached ? (
                <Link
                  href="/register"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  とうろくして もっと はなす
                </Link>
              ) : null}
            </div>

            {error ? (
              <p
                className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                aria-live="assertive"
              >
                {error}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
