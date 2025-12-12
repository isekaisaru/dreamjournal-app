"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import useVoiceRecorder from "@/hooks/useVoiceRecorder";
import { uploadAndAnalyzeAudio } from "@/lib/audioAnalysis";
import type { AnalysisResult, DreamDraftData } from "@/app/types";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Loader2 } from "lucide-react";

const DreamRecorderFloating: React.FC = () => {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  // idle: 待機中, preparing: マイク準備中, recording: 録音中
  const [status, setStatus] = useState<"idle" | "preparing" | "recording">(
    "idle"
  );

  // Whisper 解析結果 → 一覧画面へ遷移（非同期処理のため）
  const handleAnalysisResult = useCallback(
    (result: AnalysisResult) => {
      // 成功メッセージを表示
      toast.success(result.message || "音声を受け付けました。解析を開始します。");

      // 一覧画面へリダイレクト（新しい夢が作成されているはず）
      // 即時にリストを更新して、pending状態のカードを表示する
      // 即時にリストを更新して、pending状態のカードを表示する
      window.dispatchEvent(new Event("dream-created")); // PendingDreamsMonitorに通知
      router.refresh();
      router.push("/home");
    },
    [router]
  );

  // Blob → Whisper API
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
            : "音声の解析に失敗しました。時間をおいて再度お試しください。"
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

  // isRecording の変化だけで status を同期する
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isRecording) {
      setStatus("recording");
    } else if (!isProcessing && status === "recording") {
      setStatus("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, isProcessing]);

  useEffect(() => {
    if (error) setStatus("idle");
  }, [error]);

  const handleToggleRecording = async () => {
    if (isProcessing) return;

    if (navigator?.vibrate) navigator.vibrate(200);

    if (status === "recording") {
      stopRecording();
    } else {
      setStatus("preparing");
      try {
        await startRecording();
      } catch {
        setStatus("idle");
      }
    }
  };

  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (e.type === "touchstart") {
      e.preventDefault();
      e.stopPropagation();
    }
    handleToggleRecording();
  };

  return (
    <div className="fixed bottom-24 right-4 z-[9999] flex flex-col items-end gap-3">
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="max-w-xs rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground shadow"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onTouchStart={handleInteraction}
        onClick={handleInteraction}
        disabled={isProcessing}
        role="switch"
        aria-checked={status === "recording"}
        aria-label={status === "recording" ? "録音を停止" : "録音を開始"}
        whileTap={{ scale: 0.9 }}
        animate={
          status === "recording"
            ? {
              scale: [1, 1.08, 1],
              boxShadow: [
                "0 0 0 0 rgba(239, 68, 68, 0.4)",
                "0 0 0 12px rgba(239, 68, 68, 0)",
              ],
            }
            : { scale: 1, boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }
        }
        transition={
          status === "recording"
            ? {
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }
            : { type: "spring", stiffness: 400, damping: 17 }
        }
        className={`flex h-16 w-48 items-center justify-center gap-3 rounded-full shadow-lg transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-primary/40 ${status === "recording"
          ? "bg-red-500 hover:bg-red-600 text-white"
          : status === "preparing"
            ? "bg-yellow-500 text-white cursor-wait"
            : "bg-blue-600 hover:bg-blue-700 text-white"
          } ${isProcessing
            ? "cursor-not-allowed opacity-70 bg-slate-500"
            : "cursor-pointer"
          }`}
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-lg font-bold">解析中...</span>
          </>
        ) : status === "recording" ? (
          <>
            <Square className="h-6 w-6 fill-current" />
            <span className="text-lg font-bold">停止する</span>
          </>
        ) : status === "preparing" ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-lg font-bold">準備中...</span>
          </>
        ) : (
          <>
            <Mic className="h-6 w-6" />
            <span className="text-lg font-bold">録音する</span>
          </>
        )}
      </motion.button>
    </div>
  );
};

export default DreamRecorderFloating;
