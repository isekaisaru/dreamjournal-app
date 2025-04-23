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
      <div className="shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out my-4 flex flex-col p-4 md:p-6 rounded-lg bg-white group-hover:bg-gray-50">
        <h2 className="text-slate-900 text-2xl md:text-3xl font-bold group-hover:text-gray-700 pb-4">
          {dream.title}
        </h2>
        <p className="text-gray-600 mb-2">
          {format(new Date(dream.created_at), "yyyy-MM-dd")}
        </p>
        <p className="text-slate-900 text-lg md:text-xl font-bold group-hover:text-gray-700 pb-4 h-16 overflow-hidden">
          {displayContent || <span className="text-gray-400 italic">内容がありません</span>}
        </p>
        <span className="text-pink-800 group-hover:text-black transition-colors duration-200 mt-auto self-end">
          続きを読む
        </span>
      </div>
    </Link>
  );
};

export default DreamCard;
