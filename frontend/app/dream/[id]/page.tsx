"use client";

import DreamForm from "../../components/DreamForm";
import DeleteButton from "../../components/DeleteButton";
import {
  EmotionTag,
  getChildFriendlyEmotionLabel,
} from "../../components/EmotionTag";
import { useDream, type DreamInput } from "../../../hooks/useDream";
import { useRouter } from "next/navigation";
import { useState, useEffect, use } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import apiClient from "../../../lib/apiClient";
import { useAuth } from "../../../context/AuthContext";
import { AgeGroup } from "@/app/types";
import { MorpheusGuideDetail } from "@/app/components/MorpheusGuide";
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

function getDreamDetailCopy(ageGroup: AgeGroup | undefined) {
  switch (ageGroup) {
    case "child_small":
    case "child":
      return {
        content: "ゆめの おはなし",
        analysis: "🔮 モルペウスの ゆめうらない",
        image: "🎨 ゆめのえ",
        imageAlt: "ゆめのえ",
        button: "ゆめのえを かく",
        imageRedraw: "かきなおす",
        imageGenerating: "かいています...",
      };
    case "preteen":
      return {
        content: "夢の内容",
        analysis: "🔮 夢の分析",
        image: "🎨 夢のイラスト",
        imageAlt: "夢のイラスト",
        button: "夢のイラストを生成",
        imageRedraw: "描き直す",
        imageGenerating: "生成中...",
      };
    case "teen":
    case "adult":
    default:
      return {
        content: "夢の内容",
        analysis: "🔮 AI分析",
        image: "🎨 生成画像",
        imageAlt: "生成された夢のイメージ",
        button: "画像を生成する",
        imageRedraw: "再生成",
        imageGenerating: "生成中...",
      };
  }
}

function formatDate(dateInput: string | undefined): string {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  });
}

// Next.jsの新しいバージョンでは、Page Propsの`params`はPromiseになりました。
// Client Componentでこれを利用するには、Reactの`use`フックを使います。
export default function DreamDetailPage({
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

  const { user } = useAuth();
  const copy = getDreamDetailCopy(user?.age_group);

  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isAnalysisFlipped, setIsAnalysisFlipped] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageQuota, setImageQuota] = useState<{ used: number; limit: number; remaining: number } | null>(null);

  useEffect(() => {
    if (error) {
      console.error("夢データの取得に失敗しました:", error);
    }
  }, [error]);

  useEffect(() => {
    apiClient.get<{ used: number; limit: number; remaining: number }>("/dreams/image_quota")
      .then(setImageQuota)
      .catch(() => {/* 非致命的 */});
  }, []);

  useEffect(() => {
    if (dream?.generated_image_url) {
      setGeneratedImageUrl(dream.generated_image_url);
    }
  }, [dream?.generated_image_url]);

  useEffect(() => {
    setIsAnalysisFlipped(false);
  }, [dream?.id]);

  const handleGenerateImage = async () => {
    if (!dreamId || isGeneratingImage) return;
    setIsGeneratingImage(true);
    setImageError(null);
    try {
      const result = await apiClient.post<{ image_url: string }>(
        `/dreams/${dreamId}/generate_image`,
        {},
        { timeoutMs: 60_000 }
      );
      setGeneratedImageUrl(result.image_url);
    } catch (err) {
      setImageError(
        err instanceof Error ? err.message : "えの せいせい に しっぱい しました"
      );
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleImageLoadError = () => {
    const isRemoteBlobUrl =
      typeof generatedImageUrl === "string" &&
      generatedImageUrl.startsWith("https://oaidalleapiprodscus.blob.core.windows.net/");

    setImageError(
      isRemoteBlobUrl
        ? "ほぞんずみ の ゆめのえ の きげん が きれました。もういちど かいてみてください。"
        : "ゆめのえ を ひょうじ できませんでした。"
    );
    setGeneratedImageUrl(null);
  };

  const handleUpdateSubmit = async (formData: DreamInput) => {
    if (!dreamId) return;
    const success = await hookUpdateDream(formData);
    if (success) {
      setIsEditing(false);
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

  // --- 編集モード ---
  if (isEditing) {
    return (
      <div className="min-h-screen py-8 px-4 md:px-12 max-w-3xl mx-auto text-foreground">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">ゆめ の なおし</h1>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg px-4 py-2 transition-colors"
          >
            やめる
          </button>
        </div>

        <DreamForm
          initialData={dream}
          onSubmit={handleUpdateSubmit}
          isLoading={isUpdating}
        />
      </div>
    );
  }

  // --- 閲覧専用モード ---
  // AI感情タグ (analysis_json) と手動タグ (emotions) を統合して表示
  const aiEmotionTags: string[] =
    dream.analysis_json?.emotion_tags && dream.analysis_json.emotion_tags.length > 0
      ? Array.from(
          new Set(
            dream.analysis_json.emotion_tags.map((t) =>
              getChildFriendlyEmotionLabel(t)
            )
          )
        )
      : [];
  const dbEmotionTags: string[] =
    dream.emotions && dream.emotions.length > 0
      ? Array.from(
          new Set(dream.emotions.map((e) => getChildFriendlyEmotionLabel(e.name)))
        )
      : [];
  const displayTags = aiEmotionTags.length > 0 ? aiEmotionTags : dbEmotionTags;
  const analysisText =
    dream.analysis_json?.analysis || dream.analysis_json?.text || "";
  const analysisPreview = displayTags.length
    ? "感じたことを みつけたよ"
    : "タップすると モルペウスの読み取りがひらくよ";

  return (
    <div className="min-h-screen py-8 px-4 md:px-12 max-w-3xl mx-auto text-foreground">
      {/* ヘッダー：日付 */}
      <p className="text-sm text-muted-foreground mb-2" suppressHydrationWarning>
        {formatDate(dream.created_at)}
      </p>

      {/* タイトル */}
      <h1 className="text-3xl font-bold mb-4 text-foreground leading-snug">
        {dream.title}
      </h1>

      {/* 感情タグ */}
      {displayTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {displayTags.map((tag, i) => (
            <EmotionTag key={i} label={tag} />
          ))}
        </div>
      )}

      {/* 夢の内容 */}
      {dream.content && dream.content !== dream.title && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <p className="text-sm font-semibold text-muted-foreground mb-2">
            {copy.content}
          </p>
          <p className="text-foreground leading-relaxed whitespace-pre-wrap">
            {dream.content}
          </p>
        </div>
      )}

      {/* モルペウスのゆめうらない */}
      {analysisText && (
        <div className="mb-6" style={{ perspective: 1400 }}>
          <button
            type="button"
            onClick={() => setIsAnalysisFlipped((current) => !current)}
            className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-pressed={isAnalysisFlipped}
          >
            <motion.div
              animate={{ rotateY: isAnalysisFlipped ? 180 : 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformStyle: "preserve-3d" }}
              className="relative min-h-[220px]"
            >
              <div
                className="absolute inset-0 overflow-y-auto rounded-[28px] border border-primary/20 p-5 shadow-lg"
                style={{
                  backfaceVisibility: "hidden",
                  background:
                    "linear-gradient(160deg, rgba(255,255,255,0.96), rgba(240,249,255,0.94))",
                }}
              >
                <p className="text-sm font-semibold text-muted-foreground">
                  {copy.analysis}
                </p>
                <div className="mt-4 flex items-center gap-4">
                  <div className="rounded-3xl bg-primary/10 px-4 py-3 text-3xl">
                    🔮
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      モルペウスが 夢を読みほどいたよ
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {analysisPreview}
                    </p>
                  </div>
                </div>
                <div className="mt-6 rounded-2xl bg-background/80 px-4 py-4">
                  <p className="text-sm leading-relaxed text-foreground/85 line-clamp-4">
                    {!isAnalysisFlipped ? analysisText : null}
                  </p>
                </div>
                <p className="mt-4 text-xs font-medium text-primary">
                  タップで くるっと裏返して全文をみる
                </p>
              </div>
              <div
                className="absolute inset-0 overflow-y-auto rounded-[28px] border border-border bg-muted/50 p-5 shadow-lg"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-muted-foreground">
                    {copy.analysis}
                  </p>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    flip back
                  </span>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {isAnalysisFlipped ? analysisText : null}
                </p>
              </div>
            </motion.div>
          </button>
        </div>
      )}

      {/* ゆめのえ */}
      <div className="mb-6">
        {generatedImageUrl ? (
          <div className="space-y-2">
            <div className="overflow-hidden rounded-[30px] border border-border bg-card shadow-lg">
              <div className="flex items-center gap-2 border-b border-border/80 bg-muted/50 px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-rose-400" />
                <span className="h-3 w-3 rounded-full bg-amber-300" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                <p className="ml-2 text-xs font-medium text-muted-foreground">
                  dream-window.png
                </p>
              </div>
              <Image
                src={generatedImageUrl}
                alt={copy.imageAlt}
                width={1024}
                height={1024}
                className="w-full h-auto"
                unoptimized
                onError={handleImageLoadError}
                style={{
                  background:
                    "radial-gradient(circle at top, rgba(125,211,252,0.16), transparent 42%), linear-gradient(180deg, rgba(248,250,252,0.92), rgba(226,232,240,0.65))",
                }}
              />
              <div className="p-3 bg-card flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{copy.image}</p>
                <button
                  type="button"
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {isGeneratingImage ? copy.imageGenerating : copy.imageRedraw}
                </button>
              </div>
            </div>
            {imageError && (
              <p className="text-xs text-destructive">{imageError}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 rounded-xl border border-dashed border-border bg-muted/20">
            <button
              type="button"
              onClick={handleGenerateImage}
              disabled={isGeneratingImage}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isGeneratingImage ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                  {copy.imageGenerating}
                </>
              ) : (
                <>🎨 {copy.button}</>
              )}
            </button>
            {imageError && (
              <p className="text-xs text-destructive">{imageError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {imageQuota
                ? `今月あと ${imageQuota.remaining} 枚 生成できます（${imageQuota.used} / ${imageQuota.limit}）`
                : "AIが夢のイメージを絵にします（月30枚まで）"}
            </p>
          </div>
        )}
      </div>

      {/* アクションボタン */}
      <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
        {dream.id && <DeleteButton onClick={handleDeleteClick} />}
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          ✏️ なおす
        </button>
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
            <AlertDialogCancel disabled={isDeleting}>やめる</AlertDialogCancel>
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
      <MorpheusGuideDetail />
    </div>
  );
}
