"use client";

import DreamForm from "../../components/DreamForm";
import DeleteButton from "../../components/DeleteButton";
import { useDream, DreamInput } from "../../../hooks/useDream";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import axios from "axios";
import useAuth from "../../../hooks/useAuth";
import { Dream } from "../../types";

export default function EditDreamPage() {
  const pathname = usePathname();
  const id = pathname.split("/").pop();

  const {
      dream,
      error,
      isLoading: dreamLoading,
      isUpdating,
      updateDream: hookUpdateDream,
      deleteDream: hookDeleteDream
  } = useDream(id as string);

  const router = useRouter();
  const { getValidAccessToken } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState("");

  useEffect(() => {
    if (dream) {
      console.log("Fetched dream data for analysis:", dream);
    }
    if (error) {
      alert(`エラー: ${error}`);
    }
  }, [dream, error]);

  const handleUpdateSubmit = async (formData: DreamInput) => {
    if (!id) return;
    await hookUpdateDream(formData);
  };

  const handleAnalyze = async () => {
    if (!id) return;
    if (!dream || !dream.content || dream.content.trim() === "") {
      setAnalysisResult(
        "分析対象の夢の内容がありません。編集画面で内容を追加・保存してください。"
      );
      return;
    }
    setIsAnalyzing(true);
    setAnalysisResult("");
    try {
      const token = await getValidAccessToken();
      if (!token) {
        setAnalysisResult("分析を開始できませんでした。再度ログインしてください。");
        setIsAnalyzing(false); return;
      }
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/dreams/${id}/analyze`, {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAnalysisResult(response.data.analysis);
    } catch (err) {
      console.error("分析エラー:", err);
      let errorMessage = "分析中にエラーが発生しました。";
       if (axios.isAxiosError(err) && err.response?.data?.error) {
         errorMessage = err.response.data.error;
       } else if (err instanceof Error) { errorMessage = err.message; }
      setAnalysisResult(errorMessage);
    } finally { setIsAnalyzing(false); }
  };

  const handleDelete = async () => {
      if (dream && window.confirm(`「${dream.title}」を削除してもよろしいですか？`)) {
          await hookDeleteDream(dream.id);
      }
  }

  if (dreamLoading) return <p className="text-center mt-10">夢の情報を読み込み中...</p>;

  if (error && !dream) return <p className="text-red-500 text-center mt-10">エラー: {error}</p>;


  if (!dream) return <p className="text-center mt-10">指定された夢が見つかりません。</p>;

  return (
    <div className="min-h-screen py-8 px-4 md:px-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">夢の詳細・編集</h1>

      <DreamForm
        initialData={dream}
        onSubmit={handleUpdateSubmit}
        isLoading={isUpdating}
      />

      <div className="mt-8 p-6 border border-gray-200 rounded-lg bg-gray-50 shadow-sm">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">夢の分析</h2>
        {dream.content && dream.content.trim() !== "" ? (
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || isUpdating}
            className={`w-full py-3 px-4 text-white font-semibold rounded-md transition-colors duration-150 ease-in-out ${
              isAnalyzing || isUpdating ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            }`}
          >
            {isAnalyzing ? "分析中..." : "この夢を分析する"}
          </button>
        ) : (
          <p className="text-gray-500 text-center py-2">
            夢の内容が記録されていません。分析するには、編集フォームで内容を入力・保存してください。
          </p>
        )}
        {analysisResult && (
          <div className="mt-6 p-4 bg-white rounded-md border border-gray-300 shadow-inner">
            <h3 className="text-xl font-bold mb-3 text-gray-800">分析結果</h3>
            <div className="max-h-80 overflow-y-auto p-3 bg-gray-50 rounded border border-gray-200">
              <p className="text-gray-700 whitespace-pre-wrap text-base leading-relaxed">{analysisResult}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
         {dream.id && <DeleteButton id={dream.id} onClick={handleDelete} />}
      </div>
    </div>
  );
}
