"use client";

import React, { useState } from "react";
import { Dream } from "../types";

interface DreamFormProps {
  initialData?: Dream;
  onSubmit: (data: { title: string; description: string }) => void;
  isLoading?: boolean;
}

export default function DreamForm({
  initialData,
  onSubmit,
  isLoading = false,
}: DreamFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || ""
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim() });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 border rounded-md bg-white shadow-md"
    >
      <label className="block mb-2 font-semibold">タイトル</label>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full p-2 border rounded-md text-gray-900 bg-white focus:ring-blue-500 focus:border-blue-500"
        required
      />
      <label className="block mt-4 mb-2 font-semibold">内容</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full p-2 border rounded-md text-gray-900 bg-white focus:ring-blue-500 focus:border-blue-500"
        required
      ></textarea>
      <button
        type="submit"
        className={`mt-4 w-full py-2 rounded text-white ${
          isLoading ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"
        }`}
        disabled={isLoading}
      >
        {isLoading ? "送信中..." : "保存"}
      </button>
    </form>
  );
}
