"use client";

import React from "react";

/**
 * DreamCard のローディング中に表示するスケルトンカード
 * DreamCard と同じサイズ・レイアウトで animate-pulse を使用
 */
const DreamCardSkeleton = () => {
  return (
    <div className="h-full shadow-md flex flex-col p-5 rounded-xl bg-card border border-border/50 animate-pulse">
      {/* Header: Date & Title */}
      <div className="mb-3">
        <div className="flex justify-between items-start mb-1">
          {/* 日付 */}
          <div className="h-3 w-20 bg-muted rounded" />
        </div>
        {/* タイトル */}
        <div className="h-5 w-3/4 bg-muted rounded mt-2" />
      </div>

      {/* Body: Content */}
      <div className="space-y-2 mb-4">
        <div className="h-3 w-full bg-muted rounded" />
        <div className="h-3 w-5/6 bg-muted rounded" />
        <div className="h-3 w-4/6 bg-muted rounded" />
      </div>

      {/* Footer: Emotion tags */}
      <div className="mt-auto pt-2 flex items-end justify-between gap-2">
        <div className="flex gap-1.5">
          <div className="h-5 w-14 bg-muted rounded-full" />
          <div className="h-5 w-12 bg-muted rounded-full" />
        </div>
        <div className="h-4 w-10 bg-muted rounded" />
      </div>
    </div>
  );
};

/**
 * ホームページのグリッドに合わせたスケルトンリスト
 */
export const DreamListSkeleton = ({ count = 6 }: { count?: number }) => {
  return (
    <div className="w-full grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <DreamCardSkeleton key={i} />
      ))}
    </div>
  );
};

export default DreamCardSkeleton;
