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
      className="p-6 border rounded-lg bg-white shadow"
    >
      <div className="mb-4">
        <label htmlFor="dream-title" className="block mb-2 font-semibold text-gray-700">タイトル</label>
        <input
          id="dream-title" type="text" value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded text-gray-900 bg-white focus:ring-indigo-500 focus:border-indigo-500"
          required
        />
      </div>

      <div className="mb-6">
        <label htmlFor="dream-content" className="block mb-2 font-semibold text-gray-700">夢の内容</label>
        <textarea
          id="dream-content" value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded text-gray-900 bg-white focus:ring-indigo-500 focus:border-indigo-500 h-40"
          placeholder="見た夢の内容をできるだけ詳しく書いてみましょう..."
        ></textarea>
      </div>

      <button
        type="submit"
        className={`w-full py-2.5 px-4 rounded text-white font-medium transition-colors ${
          isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        }`}
        disabled={isLoading}
      >
        {isLoading ? "保存中..." : "保存"}
      </button>
    </form>
  );
}
