"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

import { Dream, Emotion, DreamDraftData } from "../types";
import { getEmotions, previewAnalysis, ApiError } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import { groupEmotionsByDisplayLabel } from "./emotionGrouping";
import MorpheusSVG from "./MorpheusSVG";

interface DreamFormData {
  title: string;
  content?: string;
  emotion_ids?: number[];
  analysis_json?: {
    analysis: string;
    text?: string;
    emotion_tags: string[];
  };
  analysis_status?: string;
  analyzed_at?: string;
}

interface DreamFormProps {
  initialData?: Dream;
  onSubmit: (data: DreamFormData) => void;
  isLoading?: boolean;
}

export default function DreamForm({
  initialData,
  onSubmit,
  isLoading = false,
}: DreamFormProps) {
  const mapEmotionNamesToIds = (
    availableEmotions: Emotion[],
    emotionNames: string[]
  ): number[] =>
    availableEmotions
      .filter((emotion) => emotionNames.includes(emotion.name))
      .map((emotion) => emotion.id);

  const tempId = useRef(
    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [emotions, setEmotions] = useState<Emotion[]>([]);
  const [selectedEmotionIds, setSelectedEmotionIds] = useState<number[]>([]);
  const [isFetchingEmotions, setIsFetchingEmotions] = useState(false);
  // 音声解析結果を保持するstate
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [suggestedEmotionNames, setSuggestedEmotionNames] = useState<string[]>(
    []
  );
  const [isDraftApplied, setIsDraftApplied] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisLimitReached, setAnalysisLimitReached] = useState(false);
  const [analysisRevealKey, setAnalysisRevealKey] = useState(0);
  const [morpheusRating, setMorpheusRating] = useState<"good" | "bad" | null>(
    null
  );
  const morpheusRatingKey = `morpheus_rating_${initialData?.id ?? tempId.current}`;

  useEffect(() => {
    const savedRating = localStorage.getItem(morpheusRatingKey);
    if (savedRating === "good" || savedRating === "bad") {
      setMorpheusRating(savedRating);
    }
  }, [morpheusRatingKey]);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setContent(initialData.content || "");
      setSelectedEmotionIds(initialData.emotions?.map((e) => e.id) || []);
      // Populate analysis state from initialData if available
      if (initialData.analysis_json) {
        setAnalysisText(
          initialData.analysis_json.analysis ||
            initialData.analysis_json.text ||
            ""
        );
        setSuggestedEmotionNames(initialData.analysis_json.emotion_tags || []);
      } else {
        setAnalysisText(null);
        setSuggestedEmotionNames([]);
      }
    }
  }, [initialData]);

  useEffect(() => {
    // 編集画面（initialDataがある）の場合は何もしない
    if (initialData) {
      return;
    }

    // sessionStorage からドラフトデータを読み込む
    const draftJson = sessionStorage.getItem("dream_draft_data");
    if (draftJson) {
      try {
        const draftData: DreamDraftData = JSON.parse(draftJson);

        if (draftData.transcript) {
          setTitle(draftData.transcript);
          setContent(draftData.transcript);
        }
        if (draftData.analysis) {
          setAnalysisText(draftData.analysis);
        }
        if (draftData.emotion_tags && draftData.emotion_tags.length > 0) {
          setSuggestedEmotionNames(draftData.emotion_tags);
        }

        setIsDraftApplied(true);
        toast.success("録音データを復元しました。");

        // 読み込み完了後、データを削除（二重読み込み防止）
        sessionStorage.removeItem("dream_draft_data");
      } catch (e) {
        console.error("Failed to parse draft data", e);
      }
    } else {
      // URLパラメータからの読み込み（後方互換性のため残す場合はここ、今回は完全移行なら削除でも可だが念のため残すなら以下）
      // 今回は完全移行としてURLパラメータ読み込みは削除し、sessionStorageのみにする
    }
  }, [initialData]);

  useEffect(() => {
    const fetchEmotions = async () => {
      setIsFetchingEmotions(true);
      try {
        // 以前: 汎用のapiClient.getを使っていました。
        // 今回: 感情リスト取得専用の `getEmotions` 関数を使います。
        const emotionsData = await getEmotions();
        setEmotions(emotionsData);
      } catch {
        toast.error("感情一覧の取得に失敗しました。");
      } finally {
        setIsFetchingEmotions(false);
      }
    };
    fetchEmotions();
  }, []);

  useEffect(() => {
    if (emotions.length === 0 || suggestedEmotionNames.length === 0) {
      return;
    }

    // 過去の夢の編集モードでは、初期ロード時に手動選択済みタグを
    // AI提案タグで上書きしないようにする。
    if (initialData) {
      return;
    }

    // AI提案タグが変わったら、その提案内容をそのまま選択状態へ反映する。
    setSelectedEmotionIds(
      mapEmotionNamesToIds(emotions, suggestedEmotionNames)
    );
  }, [emotions, suggestedEmotionNames, initialData]);

  // handleEmotionChange は新しいUIで直接使用されなくなったため削除

  const handleAnalyze = async () => {
    if (!content.trim()) {
      toast.error("どんな ゆめ だったか おしえてね");
      return;
    }

    setAnalysisLimitReached(false);
    setIsAnalyzing(true);
    try {
      const result = await previewAnalysis(content);
      setAnalysisText(result.analysis);
      setSuggestedEmotionNames(result.emotion_tags);
      setSelectedEmotionIds(mapEmotionNamesToIds(emotions, result.emotion_tags));
      setAnalysisRevealKey((current) => current + 1);
      setMorpheusRating(null);
      localStorage.removeItem(morpheusRatingKey);
      toast.success("モルペウスが おへんじ したよ！");
    } catch (error) {
      if (error instanceof ApiError && error.status === 403 && error.data?.limit_reached) {
        setAnalysisLimitReached(true);
      } else {
        console.error("Analysis failed:", error);
        toast.error("モルペウスと おはなし できなかった...");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("ゆめの なまえ を かいてね");
      return;
    }

    const analysisPayload =
      analysisText || suggestedEmotionNames.length > 0
        ? {
            analysis: analysisText ?? "",
            emotion_tags: suggestedEmotionNames,
          }
        : undefined;

    onSubmit({
      title: title.trim(),
      content: content.trim(),
      emotion_ids: selectedEmotionIds,
      ...(analysisPayload
        ? {
            analysis_json: analysisPayload,
            analysis_status: "done",
            analyzed_at: new Date().toISOString(),
          }
        : {}),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 border border-border rounded-lg bg-card text-card-foreground shadow"
    >
      {isDraftApplied && (
        <div className="mb-4 rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary-foreground">
          モルペウスが きいた おはなし だよ。まちがってたら なおしてね。
        </div>
      )}
      <div className="mb-4">
        <label
          htmlFor="dream-title"
          className="block mb-2 font-semibold text-card-foreground"
        >
          ゆめの なまえ
        </label>
        <input
          id="dream-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 border border-input bg-background text-foreground rounded focus:ring-2 focus:ring-ring focus:border-ring"
          required
        />
      </div>

      <div className="mb-6">
        <label
          htmlFor="dream-content"
          className="block mb-2 font-semibold text-card-foreground"
        >
          どんな おはなし？
        </label>
        <textarea
          id="dream-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full p-2 border border-input bg-background text-foreground rounded focus:ring-2 focus:ring-ring focus:border-ring h-40"
          placeholder="どんな ゆめ だった？ おもいだせる だけ かいてみてね..."
        ></textarea>
        {/* Analysis Button */}
        <div className="mt-3 flex justify-end">
          {analysisLimitReached ? (
            <div className="flex flex-col items-end gap-2">
              <p className="text-xs text-amber-600 dark:text-amber-400">
                今月の無料分析回数を使い切ったよ
              </p>
              <a
                href="/subscription"
                className="px-4 py-2 rounded-full font-bold text-sm bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-md hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <span>✨</span>
                <span>プレミアムで無制限に使う</span>
              </a>
            </div>
          ) : (
            <motion.button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !content.trim()}
              whileHover={isAnalyzing || !content.trim() ? undefined : { y: -2, scale: 1.01 }}
              whileTap={isAnalyzing || !content.trim() ? undefined : { scale: 0.98 }}
              className={`
                  px-4 py-2 rounded-full font-bold text-sm transition-all shadow-md flex items-center gap-2
                  ${
                    isAnalyzing
                      ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                      : "bg-muted text-muted-foreground hover:bg-muted/70 border border-border"
                  }
                `}
            >
              {isAnalyzing ? (
                <>
                  <span className="animate-spin text-lg">✨</span>
                  <span>かんがえ中...</span>
                </>
              ) : analysisText ? (
                <>
                  <span className="text-lg">🔄</span>
                  <span>もういちど きく</span>
                </>
              ) : (
                <>
                  <span className="text-lg">🔮</span>
                  <span>モルペウスに きく</span>
                </>
              )}
            </motion.button>
          )}
        </div>
        {isAnalyzing ? (
          <div className="mt-4 overflow-hidden rounded-[28px] border border-sky-200/50 bg-slate-950 px-4 py-4 text-slate-50 shadow-lg">
            <div className="flex items-center gap-4">
              <MorpheusSVG expression="dreaming" size={74} />
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
                  Morpheus Reading
                </p>
                <p className="mt-1 text-sm font-semibold">
                  ゆめのつづきを そっと よみといているよ
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-sky-950/80">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-sky-300 via-yellow-200 to-sky-400"
                    initial={{ width: "18%" }}
                    animate={{ width: ["18%", "76%", "58%", "88%"] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 flex gap-2 text-lg">
              {["✦", "⋆", "✧"].map((star, index) => (
                <motion.span
                  key={`${star}-${index}`}
                  initial={{ opacity: 0.35, y: 8 }}
                  animate={{ opacity: [0.35, 1, 0.35], y: [8, 0, 8] }}
                  transition={{ duration: 1.8, delay: index * 0.18, repeat: Infinity }}
                  className="text-sky-200"
                >
                  {star}
                </motion.span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {analysisText && (
        <motion.div
          key={`${analysisRevealKey}-${analysisText}`}
          initial={{ opacity: 0, rotateX: -14, y: 20 }}
          animate={{ opacity: 1, rotateX: 0, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6"
        >
          <label className="block mb-2 font-semibold text-card-foreground">
            モルペウスの ゆめうらない
          </label>
          <div className="rounded-[28px] border border-input bg-muted/50 p-4 text-sm leading-relaxed text-foreground shadow-sm">
            <div className="mb-3 flex items-center justify-between rounded-2xl bg-background/70 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Dream Reveal
              </p>
              <p className="text-xs text-muted-foreground">ふわっと あらわれたよ</p>
            </div>
            <p className="whitespace-pre-wrap">{analysisText}</p>
            {suggestedEmotionNames.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestedEmotionNames.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">モルペウスは あたってた？</span>
            <button
              type="button"
              onClick={() => {
                setMorpheusRating("good");
                localStorage.setItem(morpheusRatingKey, "good");
              }}
              className={`rounded-full p-1 text-2xl transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${morpheusRating === "good" ? "scale-125" : ""}`}
              aria-label="モルペウスの占いが当たった"
              aria-pressed={morpheusRating === "good"}
            >
              👍
            </button>
            <button
              type="button"
              onClick={() => {
                setMorpheusRating("bad");
                localStorage.setItem(morpheusRatingKey, "bad");
              }}
              className={`rounded-full p-1 text-2xl transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${morpheusRating === "bad" ? "scale-125" : ""}`}
              aria-label="モルペウスの占いが違った"
              aria-pressed={morpheusRating === "bad"}
            >
              👎
            </button>
            {morpheusRating && (
              <span className="text-xs text-muted-foreground">
                {morpheusRating === "good" ? "よかった！" : "おしえてくれて ありがとう！"}
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            ないよう や タグ は、じぶんで なおせるよ。
          </p>
        </motion.div>
      )}

      <div className="mb-6">
        <label className="block mb-2 font-semibold text-card-foreground">
          この ゆめ の きもち は どれ？
        </label>
        {isFetchingEmotions ? (
          <div className="text-muted-foreground">読み込み中...</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {(() => {
              const uniqueGroups = groupEmotionsByDisplayLabel(emotions);

              if (uniqueGroups.length === 0) {
                return (
                  <div className="text-muted-foreground col-span-full">
                    感情タグがありません。
                  </div>
                );
              }

              return uniqueGroups.map((group) => {
                // If ANY of the IDs in this group are selected, the visual tag is selected
                const isSelected = group.ids.some((id) =>
                  selectedEmotionIds.includes(id)
                );
                const checkboxId = `emotion-${group.representativeId}`;

                const baseStyle = "border-2 transition-all duration-200";
                const selectedStyle =
                  "bg-primary/10 border-primary text-primary font-bold shadow-inner ring-2 ring-primary/20";
                const unselectedStyle =
                  "bg-card border-border hover:bg-accent hover:border-accent-foreground/50 text-foreground";

                return (
                  <motion.label
                    key={group.displayLabel}
                    htmlFor={checkboxId}
                    whileHover={{ y: -1, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center justify-center p-4 rounded-xl cursor-pointer ${baseStyle} ${isSelected ? selectedStyle : unselectedStyle}`}
                  >
                    <input
                      id={checkboxId}
                      type="checkbox"
                      className="sr-only"
                      aria-label={group.displayLabel}
                      checked={isSelected}
                      onChange={() => {
                        // Toggle logic:
                        // If selected, remove ALL ids belonging to this group (unselect 'Happy' and 'Joy')
                        // If unselected, add the representative ID (just 'Happy')
                        if (isSelected) {
                          setSelectedEmotionIds((prev) =>
                            prev.filter((id) => !group.ids.includes(id))
                          );
                        } else {
                          setSelectedEmotionIds((prev) => [
                            ...prev,
                            group.representativeId,
                          ]);
                        }
                      }}
                    />
                    <span className="text-base select-none flex items-center gap-1.5">
                      {group.displayLabel}
                      {isSelected ? (
                        <motion.span
                          aria-hidden="true"
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-amber-400"
                        >
                          ✦
                        </motion.span>
                      ) : null}
                    </span>
                  </motion.label>
                );
              });
            })()}
          </div>
        )}
      </div>

      <button
        type="submit"
        className={`w-full py-2.5 px-4 rounded font-medium transition-colors ${
          isLoading
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-primary hover:bg-primary/90 text-primary-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
        }`}
        disabled={isLoading}
      >
        {isLoading ? "モルペウスが かんがえています..." : "ゆめを のこす"}
      </button>
    </form>
  );
}
