"use client";

import Image from "next/image";
import { EmotionTag } from "./EmotionTag";

type DreamShareCardProps = {
  imageUrl: string;
  title: string;
  recordedAt: string;
  emotionLabels: string[];
  imageAlt: string;
};

function formatDate(dateInput: string): string {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  });
}

export default function DreamShareCard({
  imageUrl,
  title,
  recordedAt,
  emotionLabels,
  imageAlt,
}: DreamShareCardProps) {
  const formattedDate = formatDate(recordedAt);

  return (
    <section
      aria-label="夢画像シェアカード"
      data-testid="dream-share-card"
      className="mt-6 overflow-hidden rounded-lg border border-sky-200/70 bg-gradient-to-br from-sky-50 via-white to-amber-50 text-slate-900 shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        <Image
          src={imageUrl}
          alt={`${imageAlt} シェアカード`}
          fill
          sizes="(max-width: 768px) 100vw, 768px"
          className="object-cover"
          unoptimized
        />
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase text-sky-700">
            YumeTree
          </p>
          <p className="text-xs font-semibold text-slate-500">ユメツリー</p>
        </div>

        <div>
          {formattedDate && (
            <p className="text-sm font-medium text-slate-500">
              {formattedDate}
            </p>
          )}
          <h2 className="mt-1 text-2xl font-bold leading-tight text-slate-950">
            {title}
          </h2>
        </div>

        {emotionLabels.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {emotionLabels.slice(0, 4).map((label, index) => (
              <EmotionTag key={`${label}-${index}`} label={label} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
