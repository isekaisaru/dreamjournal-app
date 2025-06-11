"use client";

import React, { useState, useEffect } from "react";
import { Dream } from "../types";

interface DreamFormData {
  title: string;
  content?: string;
}

interface DreamFormProps {
  initialData?: Dream;
  onSubmit: (data: DreamFormData) => void;
  isLoading?: boolean;
}

export default function DreamForm({ initialData, onSubmit, isLoading = false }: DreamFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setContent(initialData.content || "");
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
        alert("タイトルを入力してください。");
        return;
    }
    onSubmit({
        title: title.trim(),
        content: content.trim()
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
