import React from "react";
import { Dream } from "@/app/types";
import Link from "next/link";
import { EmotionTag } from "./EmotionTag";

function formatDate(dateInput: string | number | Date | undefined): string {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type DreamCardProps = {
  dream: Dream;
};

const DreamCard = ({ dream }: DreamCardProps) => {
  // タイトルと本文が完全に一致する場合は本文を隠す（スッキリさせる）
  const isContentDuplicate = dream.title === dream.content;

  return (
    <Link
      href={`dream/${dream.id}`}
      aria-label={`${dream.title} の詳細を見る`}
      className="group block h-full"
    >
      <div className="h-full shadow-md hover:shadow-lg transition-all duration-300 ease-in-out flex flex-col p-5 rounded-xl bg-card text-card-foreground border border-border/50 group-hover:border-primary/30 group-hover:bg-accent/5">
        {/* Header: Date & Title */}
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-1 font-medium" suppressHydrationWarning>
            {formatDate(dream.created_at)}
          </p>
          <h2 className="text-lg font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
            {dream.title}
          </h2>
        </div>

        {/* Body: Content (Hidden if duplicate) */}
        {!isContentDuplicate && dream.content && (
          <p className="text-sm text-muted-foreground/90 leading-relaxed line-clamp-3 mb-4">
            {dream.content}
          </p>
        )}

        {/* Footer: Emotions & Action */}
        <div className="mt-auto pt-2 flex items-end justify-between gap-2">
          {dream.emotions && dream.emotions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {dream.emotions.slice(0, 3).map((emotion) => (
                <EmotionTag key={emotion.id} label={emotion.name} />
              ))}
              {dream.emotions.length > 3 && (
                <span className="text-xs text-muted-foreground self-center px-1">
                  +{dream.emotions.length - 3}
                </span>
              )}
            </div>
          ) : (
            <div /> /* Spacer */
          )}

          <span className="text-xs font-semibold text-primary/80 group-hover:text-primary whitespace-nowrap">
            詳細 &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
};

export default DreamCard;
