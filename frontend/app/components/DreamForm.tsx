"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Dream, Emotion } from "../types";
import { getEmotions } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import { getEmotionColors } from "@/lib/emotionUtils";

interface DreamFormData {
  title: string;
  content?: string;
  emotion_ids?: number[];
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
  const searchParams = useSearchParams();
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
    // 編集画面（initialDataがある）や、URLにパラメータがない場合は何もしない
    if (initialData || !searchParams) {
      return;
    }

    const transcript = searchParams.get("transcript");
    const analysis = searchParams.get("analysis");
    const emotionTags = searchParams.getAll("emotion_tags");

    if (transcript || analysis || emotionTags.length > 0) {
      setTitle(transcript || "");
      setContent(transcript || ""); // 内容も文字起こし結果で初期化
      setAnalysisText(analysis || "");
      setSuggestedEmotionNames(emotionTags);
      setIsDraftApplied(true);
    }
  }, [initialData, searchParams]);

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
      toast.error("タイトルを入力してください。");
      return;
    }
    onSubmit({
      title: title.trim(),
      content: content.trim(),
      emotion_ids: selectedEmotionIds,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 border border-border rounded-lg bg-card text-card-foreground shadow"
    >
      {isDraftApplied && (
        <div className="mb-4 rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary-foreground">
          音声入力の内容と分析結果を自動で読み込みました。必要に応じて編集してください。
        </div>
      )}
      <div className="mb-4">
        <label
          htmlFor="dream-title"
          className="block mb-2 font-semibold text-card-foreground"
        >
          タイトル
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
          夢の内容
        </label>
        <textarea
          id="dream-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full p-2 border border-input bg-background text-foreground rounded focus:ring-2 focus:ring-ring focus:border-ring h-40"
          placeholder="見た夢の内容をできるだけ詳しく書いてみましょう..."
        ></textarea>
      </div>

      {analysisText && (
        <div className="mb-6">
          <label className="block mb-2 font-semibold text-card-foreground">
            AIによる夢の分析
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
            分析内容と感情タグは編集や削除が可能です。あなたの体験に合わせて調整してください。
          </p>
        </div>
      )}

      <div className="mb-6">
        <label className="block mb-2 font-semibold text-card-foreground">
          感情タグ
        </label>
        {isFetchingEmotions ? (
          <div className="text-muted-foreground">読み込み中...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {emotions.length > 0 ? (
              emotions.map((emotion) => {
                const isSelected = selectedEmotionIds.includes(emotion.id);
                const colors = getEmotionColors(emotion.name);
                return (
                  <label
                    key={emotion.id}
                    className={`flex items-center justify-center p-2 rounded-md border cursor-pointer transition-colors text-sm font-medium ${isSelected ? `${colors.bg} ${colors.border} ${colors.text}`.trim() : "bg-background border-input hover:bg-muted text-foreground"}`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={isSelected}
                      onChange={() => handleEmotionChange(emotion.id)}
                    />
                    <span className="whitespace-nowrap">{emotion.name}</span>
                  </label>
                );
              })
            ) : (
              <div className="text-muted-foreground col-span-full">
                感情タグがありません。
              </div>
            )}
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
        {isLoading ? "保存中..." : "保存"}
      </button>
    </form>
  );
}
