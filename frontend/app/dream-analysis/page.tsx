"use client";

import { useState } from "react";
import axios from "axios";

const DreamAnalysis = () => {
  const [dreamContent, setDreamContent] = useState("");
  const [analysisResult, setAnalysisResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    setAnalysisResult("");

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/dreams/analyze`,
        {
          content: dreamContent,
        }
      );
      setAnalysisResult(response.data.analysis);
    } catch (error) {
      console.error("分析エラー:", error);
      setAnalysisResult("分析に失敗しました。もう一度お試し下さい。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
        夢の分析
      </h1>
      <textarea
        value={dreamContent}
        onChange={(e) => setDreamContent(e.target.value)}
        placeholder="夢の内容を入力してください..."
        className="w-full p-3 border border-gray-300 rounded mb-4 text-gray-800"
        rows={5}
      />
      <button
        onClick={handleAnalyze}
        disabled={loading}
        className={`w-full py-2 px-4 text-white rounded ${
          loading ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"
        }`}
      >
        {loading ? "分析中..." : "分析する"}
      </button>
      {analysisResult && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h2 className="font-bold mb-2 text-gray-800">分析結果</h2>
          <div className="max-h-64 overflow-y-auto p-2 border border-gray-300 bg-white rounded">
            <p className="text-gray-800">{analysisResult}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DreamAnalysis;
