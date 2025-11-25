"use client";

import { useState, useEffect } from "react";
import apiClient from "@/lib/apiClient";

interface DreamAnalysisProps {
  dreamId: string;
  hasContent: boolean;
  initialAnalysis?: {
    analysis_json?: {
      analysis: string;
      text?: string;
      emotion_tags: string[];
    };
    analysis_status?: string | null;
    analyzed_at?: string | null;
  };
}

interface AnalysisResponse {
  status: "pending" | "done" | "failed" | null;
  result: {
    analysis?: string;
    text?: string;
    emotion_tags?: string[];
    error?: string;
  } | null;
  analyzed_at: string | null;
}

const DreamAnalysis = ({
  dreamId,
  hasContent,
  initialAnalysis,
}: DreamAnalysisProps) => {
  const [analysisStatus, setAnalysisStatus] = useState<
    AnalysisResponse["status"]
  >(
    (initialAnalysis?.analysis_status as AnalysisResponse["status"]) || null
  );
  const [analysisResult, setAnalysisResult] = useState<
    AnalysisResponse["result"]
  >(initialAnalysis?.analysis_json || null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // マウント時に現在の分析ステータスを確認（初期データがない場合のみ）
  useEffect(() => {
    if (initialAnalysis?.analysis_status) return;

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
  }, [dreamId, initialAnalysis]);

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

  const handleReAnalyze = async () => {
    setIsRequesting(true);
    setError(null);
    setAnalysisStatus("pending");
    try {
      await apiClient.post(`/dreams/${dreamId}/analyze`);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || "分析の開始に失敗しました。";
      setError(errorMessage);
      if (err.response?.status === 202) {
        setAnalysisStatus("pending");
      } else {
        setAnalysisStatus("failed");
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const renderResult = () => {
    if (analysisStatus === "done" && analysisResult) {
      const analysisText = analysisResult.analysis || analysisResult.text;
      const tags = analysisResult.emotion_tags || [];

      return (
        <div className="mt-6 p-4 bg-background rounded-md border border-border shadow-inner">
          <h3 className="text-xl font-bold mb-3 text-foreground">
            --- AIによる夢の分析 ---
          </h3>
          <div className="max-h-80 overflow-y-auto p-3 bg-muted/50 rounded border border-border">
            {analysisText ? (
              <p className="text-foreground whitespace-pre-wrap text-base leading-relaxed">
                {analysisText}
              </p>
            ) : (
              <p className="text-muted-foreground">分析データはありません</p>
            )}
            {tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="text-sm font-semibold text-primary bg-primary/10 px-2 py-1 rounded"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
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
          {renderResult()}
          
          <div className="mt-6">
            <button
              onClick={handleReAnalyze}
              disabled={isRequesting || analysisStatus === "pending"}
              className={`w-full py-3 px-4 font-semibold rounded-md transition-colors duration-150 ease-in-out ${
                isRequesting || analysisStatus === "pending"
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
              }`}
            >
              {isRequesting
                ? "リクエスト中..."
                : analysisStatus === "pending"
                ? "分析中..."
                : "もう一度分析する"}
            </button>
          </div>

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
    </div>
  );
};

export default DreamAnalysis;
