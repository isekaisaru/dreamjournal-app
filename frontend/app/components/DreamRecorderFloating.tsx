"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";

interface AnalysisResult {
  transcript: string;
  analysis: string;
  emotion_tags: string[];
}

type MediaRecorderStopCallback = () => Promise<void>;

const DreamRecorderFloating = () => {
  const router = useRouter();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopHandlerRef = useRef<MediaRecorderStopCallback | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    // コンポーネントのアンマウント時にストリームをクリーンアップ
    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, []);

  const resetRecorder = useCallback(() => {
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    stopHandlerRef.current = null;
    setIsRecording(false);
  }, []);

  const processRecording = useCallback(async () => {
    const audioChunks = chunksRef.current;
    chunksRef.current = [];

    if (!audioChunks.length) {
      toast.error("音声データが取得できませんでした。");
      setIsProcessing(false);
      return;
    }

    const audioBlob = new Blob(audioChunks, { type: "audio/webm" });

    if (audioBlob.size === 0) {
      toast.error("音声が短すぎるため解析できませんでした。");
      setIsProcessing(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", audioBlob, `dream-recording-${Date.now()}.webm`);

    try {
      const response = await fetch("/api/analyze_audio_dream", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "音声解析に失敗しました。");
      }

      const result = (await response.json()) as AnalysisResult;

      // URLパラメータを作成
      const params = new URLSearchParams();
      params.set("transcript", result.transcript);
      params.set("analysis", result.analysis);
      result.emotion_tags.forEach((tag) => params.append("emotion_tags", tag));

      toast.success("音声解析が完了しました。フォームに転送します。");
      // フォルダ構成に合わせて /dream/new に修正し、パラメータを付与
      router.push(`/dream/new?${params.toString()}`);
    } catch (error) {
      console.error("Failed to analyze audio dream", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "音声の解析に失敗しました。時間をおいて再度お試しください。";
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [router]);

  const setupRecorder = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      typeof window === "undefined" ||
      typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices
    ) {
      toast.error("このブラウザは音声録音に対応していません。");
      return;
    }

    try {
      setPermissionError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (stopHandlerRef.current) {
          void stopHandlerRef.current();
        }
      };

      stopHandlerRef.current = async () => {
        setIsProcessing(true);
        await processRecording();
        resetRecorder();
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      toast.success(
        "録音を開始しました。話し終わったら再度タップしてください。"
      );
    } catch (error) {
      console.error("Failed to start recording", error);
      const message =
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "マイクのアクセスが許可されていません。ブラウザ設定を確認してください。"
          : "録音を開始できませんでした。";
      setPermissionError(message);
      toast.error(message);
      resetRecorder();
    }
  }, [processRecording, resetRecorder]);

  const handleToggleRecording = async () => {
    if (isProcessing) {
      return;
    }

    if (isRecording) {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
        setIsRecording(false);
        toast.success("録音を停止しました。解析を開始します。");
      }
      return;
    }

    await setupRecorder();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {permissionError && (
        <div className="max-w-xs rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground shadow">
          {permissionError}
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
        } ${isProcessing ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
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
