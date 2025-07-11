"use client";

import DreamForm from "../../components/DreamForm";
import DeleteButton from "../../components/DeleteButton";
import { useDream, DreamInput } from "../../../hooks/useDream";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import axios from "axios";
import  { useAuth } from "@/context/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function EditDreamPage() {
  const pathname = usePathname();
  const idFromPath = pathname.split("/").pop();

  const {
    dream,
    error,
    isLoading: dreamLoading,
    isUpdating,
    updateDream: hookUpdateDream,
    deleteDream: hookDeleteDream,
  } = useDream(idFromPath);

  const router = useRouter();
  const { getValidAccessToken } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (dream) {
      console.log("Fetched dream data:", dream);
    }
    if (error) {
      alert(`エラー: ${error}`);
    }
  }, [dream, error]);

  const handleUpdateSubmit = async (formData: DreamInput) => {
    if (!idFromPath) return;
    const success = await hookUpdateDream(formData);
    if (success) {
      router.push("/home");
    }
  };

  const handleAnalyze = async () => {
    if (!idFromPath) return;
    if (!dream || !dream.content || dream.content.trim() === "") {
      setAnalysisResult("分析対象の夢の内容がありません。");
      return;
    }
    setIsAnalyzing(true);
    setAnalysisResult("");
    try {
      const token = await getValidAccessToken();
      if (!token) {
        setAnalysisResult(
          "分析を開始できませんでした。再度ログインしてください。"
        );
        return;
      }
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/dreams/${idFromPath}/analyze`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAnalysisResult(response.data.analysis);
    } catch (err) {
      console.error("分析エラー:", err);
      let errorMessage = "分析中にエラーが発生しました。";
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setAnalysisResult(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (dream && dream.id) {
      setIsDeleting(true);
      try {
        const success = await hookDeleteDream(dream.id);
        setIsDeleteDialogOpen(false);
        if (success) {
          router.push("/home");
        }
      } catch (err) {
        console.error("削除処理中にエラー:", err);
        alert("削除中にエラーが発生しました。");
      } finally {
        setIsDeleting(false);
      }
    } else {
      console.error("削除対象の夢が見つかりません。");
      setIsDeleteDialogOpen(false);
    }
  };

  if (dreamLoading)
    return <p className="text-center mt-10 text-foreground">夢の情報を読み込み中...</p>;

  if (error && !dream)
    return <p className="text-destructive text-center mt-10">エラー: {error}</p>;

  if (!dream)
    return <p className="text-center mt-10 text-foreground">指定された夢が見つかりません。</p>;

  return (
    <div className="min-h-screen py-8 px-4 md:px-12 max-w-3xl mx-auto text-foreground">
      <h1 className="text-3xl font-bold mb-6 text-foreground">夢の詳細・編集</h1>

      <DreamForm
        initialData={dream}
        onSubmit={handleUpdateSubmit}
        isLoading={isUpdating}
      />

      <div className="mt-8 p-6 border border-border rounded-lg bg-card shadow-sm">
        <h2 className="text-2xl font-semibold mb-4 text-card-foreground">夢の分析</h2>
        {dream.content && dream.content.trim() !== "" ? (
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || isUpdating}
            className={`w-full py-3 px-4 font-semibold rounded-md transition-colors duration-150 ease-in-out ${
              isAnalyzing || isUpdating
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
            }`}
          >
            {isAnalyzing ? "分析中..." : "この夢を分析する"}
          </button>
        ) : (
          <p className="text-muted-foreground text-center py-2">
            夢の内容が記録されていません。分析するには、編集フォームで内容を入力・保存してください。
          </p>
        )}
        {analysisResult && (
          <div className="mt-6 p-4 bg-background rounded-md border border-border shadow-inner">
            <h3 className="text-xl font-bold mb-3 text-foreground">分析結果</h3>
            <div className="max-h-80 overflow-y-auto p-3 bg-muted/50 rounded border border-border">
              <p className="text-foreground whitespace-pre-wrap text-base leading-relaxed">
                {analysisResult}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-border flex justify-end">
        {dream.id && <DeleteButton onClick={handleDeleteClick} />}
      </div>
      {/* 削除確認 AlertDialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              夢「{dream.title}」を削除します。この操作は元に戻せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "削除中..." : "削除する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
