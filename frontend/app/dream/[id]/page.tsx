"use client";

import DreamForm from "../../components/DreamForm";
import DeleteButton from "../../components/DeleteButton";
import DreamAnalysis from "../../components/DreamAnalysis";
import { useDream, DreamInput } from "../../../hooks/useDream";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import apiClient from "@/lib/apiClient";
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
    return (
      <p className="text-center mt-10 text-foreground">
        夢の情報を読み込み中...
      </p>
    );

  if (error && !dream)
    return (
      <p className="text-destructive text-center mt-10">エラー: {error}</p>
    );

  if (!dream)
    return (
      <p className="text-center mt-10 text-foreground">
        指定された夢が見つかりません。
      </p>
    );

  return (
    <div className="min-h-screen py-8 px-4 md:px-12 max-w-3xl mx-auto text-foreground">
      <h1 className="text-3xl font-bold mb-6 text-foreground">
        夢の詳細・編集
      </h1>

      <DreamForm
        initialData={dream}
        onSubmit={handleUpdateSubmit}
        isLoading={isUpdating}
      />

      {idFromPath && (
        <DreamAnalysis
          dreamId={idFromPath}
          hasContent={!!dream.content?.trim()}
        />
      )}

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
