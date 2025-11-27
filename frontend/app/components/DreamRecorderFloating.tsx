"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import useVoiceRecorder from "@/hooks/useVoiceRecorder";
import { uploadAndAnalyzeAudio } from "@/lib/audioAnalysis";
import type { AnalysisResult } from "@/app/types";

const DreamRecorderFloating: React.FC = () => {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

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

  useEffect(() => {
    // 必要ならここで error をトースト表示してもよい（hook 内でも出しているので今は表示しない）
    if (error) {
      // toast.error(error);
    }
  }, [error]);

  const handleToggleRecording = () => {
    if (isProcessing) return;

    if (isRecording) {
      stopRecording();
    } else {
      void startRecording();
    }
  };

  return (
    <div className="fixed bottom-24 right-4 z-[9999] flex flex-col items-end gap-3">
      {error && (
        <div className="max-w-xs rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground shadow">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleToggleRecording}
        disabled={isProcessing}
        className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-primary/40 ${
          isRecording
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        } ${isProcessing ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
        aria-label={isRecording ? "録音を停止" : "録音を開始"}
      >
        {isProcessing ? (
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <span className="text-2xl">🎤</span>
        )}
      </button>

      <span className="rounded bg-card px-3 py-1 text-sm text-card-foreground shadow">
        {isProcessing
          ? "AIが夢を解析中..."
          : isRecording
            ? "録音停止"
            : "夢を声で記録"}
      </span>
    </div>
  );
};

export default DreamRecorderFloating;
