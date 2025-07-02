import React from "react";
import { Dream } from "@/app/types";
import Link from "next/link";
import { format } from "date-fns";

type DreamCardProps = {
  dream: Dream;
};

const DreamCard = ({ dream }: DreamCardProps) => {
  const MAX_CONTENT_LENGTH = 70;
  const displayContent = dream.content && dream.content.length > MAX_CONTENT_LENGTH
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
          {displayContent || <span className="text-muted-foreground italic">内容がありません</span>}
        </p>

        {dream.emotions && dream.emotions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {dream.emotions.map((emotion) => (
              <span
                key={emotion.id}
                className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full"
              >
                {emotion.name}
              </span>
            ))}
          </div>
        )}
        <span className="text-primary group-hover:text-primary/80 transition-colors duration-200 mt-auto self-end">
          続きを読む
        </span>
      </div>
    </Link>
  );
};

export default DreamCard;
