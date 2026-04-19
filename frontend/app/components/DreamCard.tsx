import React from "react";
import { Dream } from "@/app/types";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  EmotionTag,
  getChildFriendlyEmotionLabel,
  getEmotionTone,
} from "./EmotionTag";

function formatDate(dateInput: string | number | Date | undefined): string {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";
  // Vercelサーバー（UTC）でも日本時間で正しく表示するためtimeZoneを明示指定
  return date.toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  });
}

type DreamCardProps = {
  dream: Dream;
};

const DreamCard = ({ dream }: DreamCardProps) => {
  // タイトルと本文が完全に一致する場合は本文を隠す（スッキリさせる）
  const isContentDuplicate = dream.title === dream.content;
  const emotionLabels =
    dream.analysis_json?.emotion_tags && dream.analysis_json.emotion_tags.length > 0
      ? Array.from(
          new Set(
            (dream.analysis_json.emotion_tags || []).map((tag) =>
              getChildFriendlyEmotionLabel(tag)
            )
          )
        )
      : dream.emotions && dream.emotions.length > 0
        ? Array.from(
            new Set(
              (dream.emotions || []).map((emotion) =>
                getChildFriendlyEmotionLabel(emotion.name)
              )
            )
          )
        : [];
  const accentClass =
    emotionLabels[0] != null
      ? getEmotionTone(emotionLabels[0]).accentClassName
      : "from-sky-300 via-blue-200 to-indigo-400";

  return (
    <Link
      href={`/dream/${dream.id}`}
      aria-label={`${dream.title} の詳細を見る`}
      className="group block h-full"
    >
      <div className="relative h-full overflow-hidden rounded-xl border border-border/50 bg-card text-card-foreground shadow-md transition-all duration-300 ease-in-out group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-xl">
        <div
          className={`absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b ${accentClass}`}
          aria-hidden="true"
        />
        {dream.generated_image_url ? (
          <div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            aria-hidden="true"
          >
            <div
              className="absolute inset-0 scale-110 bg-cover bg-center blur-md"
              style={{ backgroundImage: `url(${dream.generated_image_url})` }}
            />
            <div className="absolute inset-0 bg-slate-950/65" />
          </div>
        ) : null}
        <div className="relative z-10 flex h-full flex-col p-5">
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
            {emotionLabels.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {emotionLabels.slice(0, 3).map((displayLabel, i) => (
                  <EmotionTag key={`emotion-${i}`} label={displayLabel} />
                ))}
                {emotionLabels.length > 3 && (
                  <span className="text-xs text-muted-foreground self-center px-1">
                    +{emotionLabels.length - 3}
                  </span>
                )}
              </div>
            ) : (
              <div />
            )}

            <span className="text-xs font-semibold text-primary/80 group-hover:text-primary whitespace-nowrap">
              よむ &rarr;
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default DreamCard;
