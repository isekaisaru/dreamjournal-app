"use client";

import DreamForm from "../../components/DreamForm";
import DeleteButton from "../../components/DeleteButton";
import { useDream, type DreamInput } from "../../../hooks/useDream";
import { useRouter } from "next/navigation";
import { useState, useEffect, use } from "react";
import dynamic from "next/dynamic";
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



// Next.jsの新しいバージョンでは、Page Propsの`params`はPromiseになりました。
// Client Componentでこれを利用するには、Reactの`use`フックを使います。
export default function EditDreamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // `use`フックでPromiseを解決し、`id`を取得します
  const { id: dreamId } = use(params);
  const {
    dream,
    error,
    isLoading: dreamLoading,
    isUpdating,
    updateDream: hookUpdateDream,
    deleteDream: hookDeleteDream,
  } = useDream(dreamId);

  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (error) {
      console.error("夢データの取得に失敗しました:", error); // TODO: alertの代わりにトースト通知などのUIでエラーを表示することを推奨します
      // 例: toast.error(`エラー: ${error}`);
    }
  }, [error]);

  const handleUpdateSubmit = async (formData: DreamInput) => {
    if (!dreamId) return;
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
        // TODO: alertの代わりにトースト通知などのUIでエラーを表示することを推奨します
        // 例: toast.error("削除中にエラーが発生しました。");
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
        ゆめ の なおし
      </h1>

      <DreamForm
        initialData={dream}
        onSubmit={handleUpdateSubmit}
        isLoading={isUpdating}
      />

      {dreamId && (
        <>
          {/* デバッグ用: analysis_json の確認 */}
          {console.log("Dream Data for Analysis:", {
            json: dream.analysis_json,
            status: dream.analysis_status,
          })}
        </>
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
            <AlertDialogTitle>ほんとうに けしちゃう？</AlertDialogTitle>
            <AlertDialogDescription>
              「{dream.title}」を ごみばこ に すてるよ？ もとには もどせないよ。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              やめる
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "けしています..." : "けしてしまう"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
