"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import useVoiceRecorder from "@/hooks/useVoiceRecorder";
import { uploadAndAnalyzeAudio } from "@/lib/audioAnalysis";
import type { AnalysisResult } from "@/app/types";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Loader2 } from "lucide-react";

const DreamRecorderFloating: React.FC = () => {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  // idle: 待機中, preparing: 準備中(マイク許可待ち等), recording: 録音中
  const [status, setStatus] = useState<"idle" | "preparing" | "recording">("idle");

  // Whisper 解析結果 → DreamForm へ受け渡し
  const handleAnalysisResult = useCallback(
    (result: AnalysisResult) => {
      const params = new URLSearchParams();

      if (result.transcript) {
        params.set("transcript", result.transcript);
      }
      if (result.analysis) {
        params.set("analysis", result.analysis);
      }
      if (Array.isArray(result.emotion_tags)) {
        result.emotion_tags
          .filter((tag) => !!tag)
          .forEach((tag) => params.append("emotion_tags", tag));
      }

      toast.success("音声解析が完了しました。フォームに転送します。");
      const qs = params.toString();
      router.push(qs ? `/dream/new?${qs}` : "/dream/new");
    },
    [router]
  );

  // useVoiceRecorder から受け取る Blob を Whisper API に送る
  const handleBlobReady = useCallback(
    async (blob: Blob) => {
      setIsProcessing(true);
      try {
        const result = await uploadAndAnalyzeAudio(blob);
        handleAnalysisResult(result);
      } catch (err) {
        console.error("Failed to analyze audio dream", err);
        const msg =
          err instanceof Error
            ? err.message
            : "音声の解析に失敗しました。時間をおいて再度お試しください。";
        toast.error(msg);
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

  // useVoiceRecorder の isRecording 状態をローカルの status に同期
  // (preparing から recording への遷移を検知するため)
  useEffect(() => {
    if (isRecording) {
      setStatus("recording");
    } else if (!isProcessing && status === "recording") {
      setStatus("idle");
    }
  }, [isRecording, isProcessing]);

  useEffect(() => {
    if (error) {
       setStatus("idle");
    }
  }, [error]);

  const handleToggleRecording = async () => {
    if (isProcessing) return;

    // バイブレーション (対応環境のみ)
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(200);
    }

    if (status === "recording") {
      stopRecording();
      // 停止後の status 変更は useEffect に任せる
    } else {
      setStatus("preparing");
      try {
        await startRecording();
        // 成功すれば useEffect で status が recording になる
      } catch (e) {
        setStatus("idle");
      }
    }
  };

  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    // タッチイベントの場合はデフォルトのクリック発火を防ぐ（ゴーストクリック防止）
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
        animate={
          status === "recording"
            ? { scale: [1, 1.05, 1], boxShadow: "0 0 20px rgba(239, 68, 68, 0.6)" }
            : { scale: 1, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }
        }
        transition={
          status === "recording"
            ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
            : {}
        }
        className={`flex h-16 w-48 items-center justify-center gap-3 rounded-full shadow-lg transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-primary/40 ${
          status === "recording"
            ? "bg-red-500 hover:bg-red-600 text-white"
            : status === "preparing"
            ? "bg-yellow-500 text-white cursor-wait"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        } ${isProcessing ? "cursor-not-allowed opacity-70 bg-slate-500" : "cursor-pointer"}`}
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
