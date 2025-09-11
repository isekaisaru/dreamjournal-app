"use client";

import { useState, useEffect } from "react";
import apiClient from "@/lib/apiClient";

interface DreamAnalysisProps {
  
  dreamId: string;
  hasContent: boolean;
}

interface AnalysisResponse {
  status: "pending" | "done" | "failed" | null;
  result: {
    text?: string;
    error?: string;
  } | null;
  analyzed_at: string | null;
}

const DreamAnalysis = ({ dreamId, hasContent }: DreamAnalysisProps) => {
  const [analysisStatus, setAnalysisStatus] =
    useState<AnalysisResponse["status"]>(null);
  const [analysisResult, setAnalysisResult] =
    useState<AnalysisResponse["result"]>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // マウント時に現在の分析ステータスを確認
  useEffect(() => {
    const initialCheck = async () => {
      try {
        const data = await apiClient.get<AnalysisResponse>(
          `/dreams/${dreamId}/analysis`
        );
        if (data.status) {
          setAnalysisStatus(data.status);
          setAnalysisResult(data.result);
        }
      } catch (err) {
        console.error("Initial analysis status check failed:", err);
      }
    };
    initialCheck();
  }, [dreamId]);

  // 'pending'状態の場合、ポーリングを開始
  useEffect(() => {
    if (analysisStatus !== "pending") return;

    const pollAnalysisStatus = async () => {
      try {
        const data = await apiClient.get<AnalysisResponse>(
          `/dreams/${dreamId}/analysis`
        );
        if (data.status !== "pending") {
          setAnalysisStatus(data.status);
          setAnalysisResult(data.result);
        }
      } catch (err) {
        console.error("Polling error:", err);
        setError("分析状態の取得に失敗しました。");
        setAnalysisStatus("failed");
      }
    };

    const intervalId = setInterval(pollAnalysisStatus, 3000); // 3秒ごとに確認

    return () => clearInterval(intervalId);
  }, [analysisStatus, dreamId]);

  const startAnalysis = async () => {
    setIsRequesting(true);
    setError(null);
    try {
      await apiClient.post(`/dreams/${dreamId}/analyze`);
      setAnalysisStatus("pending");
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || "分析の開始に失敗しました。";
      setError(errorMessage);
      if (err.response?.status === 202) {
        // すでに解析中の場合
        setAnalysisStatus("pending");
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const renderResult = () => {
    if (analysisStatus === "done" && analysisResult?.text) {
      return (
        <div className="mt-6 p-4 bg-background rounded-md border border-border shadow-inner">
          <h3 className="text-xl font-bold mb-3 text-foreground">分析結果</h3>
          <div className="max-h-80 overflow-y-auto p-3 bg-muted/50 rounded border border-border">
            <p className="text-foreground whitespace-pre-wrap text-base leading-relaxed">
              {analysisResult.text}
            </p>
          </div>
        </div>
      );
    }
    if (analysisStatus === "failed") {
      return (
        <div className="mt-6 p-4 bg-destructive/10 border border-destructive/30 rounded-md">
          <h3 className="text-xl font-bold mb-2 text-destructive">分析失敗</h3>
          <p className="text-destructive-foreground">
            {analysisResult?.error || "不明なエラーが発生しました。"}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mt-8 p-6 border border-border rounded-lg bg-card shadow-sm">
      <h2 className="text-2xl font-semibold mb-4 text-card-foreground">
        夢の分析
      </h2>
      {hasContent ? (
        <>
          <button
            onClick={startAnalysis}
            disabled={isRequesting || analysisStatus === "pending"}
            className={`w-full py-3 px-4 font-semibold rounded-md transition-colors duration-150 ease-in-out ${isRequesting || analysisStatus === "pending" ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"}`}
          >
            {isRequesting
              ? "リクエスト中..."
              : analysisStatus === "pending"
                ? "分析中..."
                : "この夢を分析する"}
          </button>
          {error && <p className="text-destructive mt-2">{error}</p>}
        </>
      ) : (
        <p className="text-muted-foreground text-center py-2">
          夢の内容が記録されていません。分析するには、編集フォームで内容を入力・保存してください。
        </p>
      )}
      {analysisStatus === "pending" && (
        <div className="mt-6 text-center text-foreground">
          <p>分析結果を取得中です。しばらくお待ちください...</p>
        </div>
      )}
      {renderResult()}
    </div>
  );
};

export default DreamAnalysis;
