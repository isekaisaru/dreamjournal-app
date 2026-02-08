import React from "react";
import { Dream } from "@/app/types";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { EmotionTag, getChildFriendlyEmotionLabel } from "./EmotionTag";

function formatDate(dateInput: string | number | Date | undefined): string {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
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
          <div className="flex justify-between items-start">
            <p
              className="text-xs text-muted-foreground mb-1 font-medium"
              suppressHydrationWarning
            >
              {formatDate(dream.created_at)}
            </p>
            {dream.analysis_status === "pending" && (
              <div className="flex flex-col gap-1 w-24">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200/50">
                  <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                  かんがえ中...
                </span>
                {/* 擬似プログレスバー */}
                <div className="h-1 w-full bg-amber-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 w-2/3 animate-pulse rounded-full"></div>
                </div>
              </div>
            )}
          </div>
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
          {/* Prioritize lightweight JSON tags, fall back to DB relation if needed */}
          {dream.analysis_json?.emotion_tags &&
          dream.analysis_json.emotion_tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {Array.from(
                new Set(
                  (dream.analysis_json.emotion_tags || []).map((tag) =>
                    getChildFriendlyEmotionLabel(tag)
                  )
                )
              )
                .slice(0, 3)
                .map((displayLabel, i) => (
                  <EmotionTag
                    key={`json-${i}`}
                    label={displayLabel /* Already mapped */}
                  />
                ))}
              {/* Count unique mapped tags */}
              {new Set(
                (dream.analysis_json.emotion_tags || []).map((tag) =>
                  getChildFriendlyEmotionLabel(tag)
                )
              ).size > 3 && (
                <span className="text-xs text-muted-foreground self-center px-1">
                  +
                  {new Set(
                    (dream.analysis_json.emotion_tags || []).map((tag) =>
                      getChildFriendlyEmotionLabel(tag)
                    )
                  ).size - 3}
                </span>
              )}
            </div>
          ) : dream.emotions && dream.emotions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {Array.from(
                new Set(
                  (dream.emotions && dream.emotions.length > 0
                    ? dream.emotions
                    : []
                  ).map((e) => getChildFriendlyEmotionLabel(e.name))
                )
              )
                .slice(0, 3)
                .map((displayLabel, i) => (
                  <EmotionTag
                    key={i}
                    label={displayLabel /* Already mapped */}
                  />
                ))}
              {/* Count unique mapped tags */}
              {new Set(
                (dream.emotions || []).map((e) =>
                  getChildFriendlyEmotionLabel(e.name)
                )
              ).size > 3 && (
                <span className="text-xs text-muted-foreground self-center px-1">
                  +
                  {new Set(
                    (dream.emotions || []).map((e) =>
                      getChildFriendlyEmotionLabel(e.name)
                    )
                  ).size - 3}
                </span>
              )}
            </div>
          ) : (
            <div /> /* Spacer */
          )}

          <span className="text-xs font-semibold text-primary/80 group-hover:text-primary whitespace-nowrap">
            よむ &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
};

export default DreamCard;
