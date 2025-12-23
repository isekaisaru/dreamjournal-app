"use client";

import React, { useState, useEffect } from "react";

import { Dream, Emotion, DreamDraftData } from "../types";
import { getEmotions } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import { getEmotionColors } from "@/lib/emotionUtils";
import { getChildFriendlyEmotionLabel } from "./EmotionTag";

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
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [emotions, setEmotions] = useState<Emotion[]>([]);
  const [selectedEmotionIds, setSelectedEmotionIds] = useState<number[]>([]);
  const [isFetchingEmotions, setIsFetchingEmotions] = useState(false);
  // 音声解析結果を保持するstate
  const [analysisText, setAnalysisText] = useState("");
  const [suggestedEmotionNames, setSuggestedEmotionNames] = useState<string[]>(
    []
  );
  const [isDraftApplied, setIsDraftApplied] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setContent(initialData.content || "");
      setSelectedEmotionIds(initialData.emotions?.map((e) => e.id) || []);
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
    if (
      !isDraftApplied ||
      emotions.length === 0 ||
      suggestedEmotionNames.length === 0
    ) {
      return;
    }

    // 既存の選択とマージするか、新規に設定するかを判断
    setSelectedEmotionIds((prevIds) => {
      if (prevIds.length > 0) {
        const merged = new Set(prevIds);
        suggestedEmotionNames.forEach((tag) => {
          const matched = emotions.find((emotion) => emotion.name === tag);
          if (matched) merged.add(matched.id);
        });
        return Array.from(merged);
      }
      // 新規作成時
      return emotions
        .filter((emotion) => suggestedEmotionNames.includes(emotion.name))
        .map((emotion) => emotion.id);
    });
  }, [emotions, isDraftApplied, suggestedEmotionNames]);

  const handleEmotionChange = (emotionId: number) => {
    setSelectedEmotionIds((prevIds) =>
      prevIds.includes(emotionId)
        ? prevIds.filter((id) => id !== emotionId)
        : [...prevIds, emotionId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("たいとる を かいてね");
      return;
    }

    const analysisPayload =
      analysisText || suggestedEmotionNames.length > 0
        ? {
          analysis: analysisText || "",
          emotion_tags: suggestedEmotionNames,
        }
        : undefined;

    onSubmit({
      title: title.trim(),
      content: content.trim(),
      emotion_ids: selectedEmotionIds,
      analysis_json: analysisPayload,
      analysis_status: analysisPayload ? "done" : undefined,
      analyzed_at: analysisPayload ? new Date().toISOString() : undefined,
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
      </div>

      {analysisText && (
        <div className="mb-6">
          <label className="block mb-2 font-semibold text-card-foreground">
            モルペウスの ゆめうらない
          </label>
          <div className="rounded-md border border-input bg-muted/50 p-4 text-sm leading-relaxed text-foreground">
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
          <p className="mt-2 text-xs text-muted-foreground">
            ないよう や タグ は、じぶんで なおせるよ。
          </p>
        </div>
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
              // 1. Group emotions by their display label to deduplicate visual options
              const groupedEmotions: Record<string, { displayLabel: string; ids: number[]; representativeId: number }> = {};

              emotions.forEach((emotion) => {
                const label = getChildFriendlyEmotionLabel(emotion.name);
                if (!groupedEmotions[label]) {
                  groupedEmotions[label] = { displayLabel: label, ids: [], representativeId: emotion.id };
                }
                groupedEmotions[label].ids.push(emotion.id);
              });

              const uniqueGroups = Object.values(groupedEmotions);

              if (uniqueGroups.length === 0) {
                return (
                  <div className="text-muted-foreground col-span-full">
                    感情タグがありません。
                  </div>
                );
              }

              return uniqueGroups.map((group) => {
                // If ANY of the IDs in this group are selected, the visual tag is selected
                const isSelected = group.ids.some(id => selectedEmotionIds.includes(id));

                const baseStyle = "border-2 transition-all duration-200";
                const selectedStyle = "bg-primary/10 border-primary text-primary font-bold shadow-inner ring-2 ring-primary/20";
                const unselectedStyle = "bg-card border-border hover:bg-accent hover:border-accent-foreground/50 text-foreground";

                return (
                  <label
                    key={group.displayLabel}
                    className={`flex items-center justify-center p-4 rounded-xl cursor-pointer ${baseStyle} ${isSelected ? selectedStyle : unselectedStyle}`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={isSelected}
                      onChange={() => {
                        // Toggle logic: 
                        // If selected, remove ALL ids belonging to this group (unselect 'Happy' and 'Joy')
                        // If unselected, add the representative ID (just 'Happy')
                        if (isSelected) {
                          setSelectedEmotionIds(prev => prev.filter(id => !group.ids.includes(id)));
                        } else {
                          setSelectedEmotionIds(prev => [...prev, group.representativeId]);
                        }
                      }}
                    />
                    <span className="text-base select-none">{group.displayLabel}</span>
                  </label>
                );
              });
            })()}
          </div>
        )}
      </div>

      <button
        type="submit"
        className={`w-full py-2.5 px-4 rounded font-medium transition-colors ${isLoading
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
