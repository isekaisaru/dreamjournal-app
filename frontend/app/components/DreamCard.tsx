import React from "react";
import { Dream } from "@/app/types";
import Link from "next/link";
import { format } from "date-fns";

type DreamCardProps = {
  dream: Dream;
};

const DreamCard = ({ dream }: DreamCardProps) => {
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
        <p className="text-slate-900 text-lg md:text-xl font-bold group-hover:text-gray-700 pb-4">
          {dream.description.length > 70
            ? dream.description.substring(0, 70) + "..."
            : dream.description}
        </p>
        <span className="text-pink-800 group-hover:text-black transition-colors duration-200">
          続きを読む
        </span>
      </div>
    </Link>
  );
};

export default DreamCard;
