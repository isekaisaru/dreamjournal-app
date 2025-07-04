"use client";

import React, { useState, useEffect } from "react";
import { Dream, Emotion } from "../types";
import apiClient from "@/lib/apiClient";
import { toast } from "react-hot-toast";
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

export default function DreamForm({ initialData, onSubmit, isLoading = false }: DreamFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [emotions, setEmotions] = useState<Emotion[]>([]);
  const [selectedEmotionIds, setSelectedEmotionIds] = useState<number[]>([]);
  const [isFetchingEmotions, setIsFetchingEmotions] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setContent(initialData.content || "");
      setSelectedEmotionIds(initialData.emotions?.map(e => e.id) || []);
    }
  }, [initialData]);
  useEffect(() => {
    const fetchEmotions = async () => {
      setIsFetchingEmotions(true);
      try {
        const response = await apiClient.get<Emotion[]>("/emotions");
        setEmotions(response.data);
      } catch (error) {
        console.error("感情一覧の取得に失敗しました:", error);
        toast.error("感情一覧の取得に失敗しました。");
      } finally {
        setIsFetchingEmotions(false);
      }
    };
    fetchEmotions();
  }, []);

  const handleEmotionChange = (emotionId: number) => {
    setSelectedEmotionIds(prevIds =>
      prevIds.includes(emotionId)
        ? prevIds.filter(id => id !== emotionId)
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
      <div className="mb-4">
        <label htmlFor="dream-title" className="block mb-2 font-semibold text-card-foreground">タイトル</label>
        <input
          id="dream-title" type="text" value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 border border-input bg-background text-foreground rounded focus:ring-2 focus:ring-ring focus:border-ring"
          required
        />
      </div>

      <div className="mb-6">
        <label htmlFor="dream-content" className="block mb-2 font-semibold text-card-foreground">夢の内容</label>
        <textarea
          id="dream-content" value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full p-2 border border-input bg-background text-foreground rounded focus:ring-2 focus:ring-ring focus:border-ring h-40"
          placeholder="見た夢の内容をできるだけ詳しく書いてみましょう..."
        ></textarea>
      </div>
      
      <div className="mb-6">
        <label className="block mb-2 font-semibold text-card-foreground">感情タグ</label>
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
                    className={`flex items-center justify-center p-2 rounded-md border cursor-pointer transition-colors text-sm font-medium ${isSelected ? `${colors.bg} ${colors.border} ${colors.text}` : 'bg-background border-input hover:bg-muted text-foreground'}`}
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
              <div className="text-muted-foreground col-span-full">感情タグがありません。</div>
            )}
          </div>
        )}
      </div>

      <button
        type="submit"
        className={`w-full py-2.5 px-4 rounded font-medium transition-colors ${
          isLoading ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary hover:bg-primary/90 text-primary-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
        }`}
        disabled={isLoading}
      >
        {isLoading ? "保存中..." : "保存"}
      </button>
    </form>
  );
}
