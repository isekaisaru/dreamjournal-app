import React from "react";
import { Dream } from "@/app/types";
import Link from "next/link";
import { format } from "date-fns";
import { getEmotionColors } from "@/lib/emotionUtils";

type DreamCardProps = {
  dream: Dream;
};

const DreamCard = ({ dream }: DreamCardProps) => {
  const MAX_CONTENT_LENGTH = 70;
  const displayContent =
    dream.content && dream.content.length > MAX_CONTENT_LENGTH
      ? dream.content.substring(0, MAX_CONTENT_LENGTH) + "..."
      : dream.content || "";
  return (
    <Link
      href={`dream/${dream.id}`}
      aria-label={`${dream.title} の詳細を見る`}
      className="group"
    >
      <div className="shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out my-4 flex flex-col p-4 md:p-6 rounded-lg bg-card text-card-foreground border border-border group-hover:bg-accent/10">
        <h2 className="text-2xl md:text-3xl font-bold group-hover:text-primary pb-4">
          {dream.title}
        </h2>
        <p className="text-muted-foreground mb-2">
          {format(new Date(dream.created_at), "yyyy-MM-dd")}
        </p>
        <p className="text-lg md:text-xl font-bold group-hover:text-primary/90 pb-4 h-16 overflow-hidden">
          {displayContent || (
            <span className="text-muted-foreground italic">
              内容がありません
            </span>
          )}
        </p>

        {dream.emotions?.length ? (
          <div className="flex flex-wrap gap-1 mb-2">
            {dream.emotions.map((emotion) => {
              const colors = getEmotionColors(emotion.name);
              return (
                <span
                  key={emotion.id}
                  className={`px-2 py-0.5 text-xs rounded border ${colors.bg} ${colors.text} ${colors.border}`}
                >
                  {emotion.name}
                </span>
              );
            })}
          </div>
        ) : null}
        <span className="text-primary group-hover:text-primary/80 transition-colors duration-200 mt-auto self-end">
          続きを読む
        </span>
      </div>
    </Link>
  );
};

export default DreamCard;
