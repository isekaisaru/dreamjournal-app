"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Mic, Pencil, Sparkles, Square, X } from "lucide-react";

import type { AnalysisResult } from "@/app/types";
import useVoiceRecorder from "@/hooks/useVoiceRecorder";
import { uploadAndAnalyzeAudio } from "@/lib/audioAnalysis";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

import { Button, type ButtonProps } from "./ui/button";

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
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<"idle" | "preparing" | "recording">(
    "idle"
  );

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
    [handleAnalysisResult]
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

    if (navigator?.vibrate) navigator.vibrate(200);

    if (status === "recording") {
      stopRecording();
      return;
    }

    setStatus("preparing");
    try {
      await startRecording();
    } catch {
      setStatus("idle");
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
              <Link
                href="/dream/new"
                onClick={() => setIsOpen(false)}
                className="flex min-h-16 w-full items-center justify-between rounded-2xl border border-border bg-background px-4 py-4 text-left transition-colors hover:bg-muted"
              >
                <div>
                  <p className="text-base font-bold text-foreground">
                    ことばで かく
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    おもいだせる ぶんだけ、ゆっくり かけるよ
                  </p>
                </div>
                <div className="rounded-full bg-primary/10 p-3 text-primary">
                  <Pencil className="h-5 w-5" />
                </div>
              </Link>

              <button
                type="button"
                onClick={handleVoiceToggle}
                disabled={isProcessing}
                className={cn(
                  "flex min-h-16 w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  status === "recording"
                    ? "border-red-300 bg-red-50 text-red-700"
                    : "border-border bg-background hover:bg-muted",
                  isProcessing ? "cursor-not-allowed opacity-70" : ""
                )}
                aria-pressed={status === "recording"}
              >
                <div>
                  <p className="text-base font-bold text-foreground">
                    {status === "recording"
                      ? "こえを とめる"
                      : "こえで はなす"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isProcessing
                      ? "モルペウスが まとめているよ"
                      : status === "recording"
                        ? "おわったら もういちど おしてね"
                        : "ボタンを おして、そのまま はなしてみよう"}
                  </p>
                </div>
                <div
                  className={cn(
                    "rounded-full p-3",
                    status === "recording"
                      ? "bg-red-100 text-red-600"
                      : "bg-sky-100 text-sky-600"
                  )}
                >
                  {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : status === "recording" ? (
                    <Square className="h-5 w-5 fill-current" />
                  ) : status === "preparing" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </div>
              </button>
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
