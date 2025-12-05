import React from "react";

type EmotionTagProps = {
  label: string;
  className?: string;
};

const getColorClass = (label: string): string => {
  // ポジティブ系 (明るいオレンジ)
  // "楽し", "嬉し", "喜", "幸", "愛", "好", "希" (希望)
  if (
    ["楽し", "嬉し", "喜", "幸", "愛", "好", "希"].some((k) =>
      label.includes(k)
    )
  ) {
    return "bg-orange-500 text-white border-orange-600";
  }
  // リラックス系 (落ち着いた緑)
  // "安", "穏", "癒", "平" (平和)
  if (["安", "穏", "癒", "平"].some((k) => label.includes(k))) {
    return "bg-emerald-500 text-white border-emerald-600";
  }
  // ネガティブ系 (濃い紫)
  // "怖", "恐", "不安", "焦", "苦", "痛", "悪夢", "緊" (緊張)
  if (
    ["怖", "恐", "不安", "焦", "苦", "痛", "悪夢", "緊"].some((k) =>
      label.includes(k)
    )
  ) {
    return "bg-purple-600 text-white border-purple-700";
  }
  // 悲しみ系 (深い青)
  // "悲", "寂", "孤独", "辛", "喪" (喪失), "悔" (後悔)
  if (["悲", "寂", "孤独", "辛", "喪", "悔"].some((k) => label.includes(k))) {
    return "bg-blue-600 text-white border-blue-700";
  }
  // 怒り系 (激しい赤)
  // "怒", "腹立", "イライラ", "不満"
  if (["怒", "腹立", "イライラ", "不満"].some((k) => label.includes(k))) {
    return "bg-red-600 text-white border-red-700";
  }
  // 不思議系 (神秘的なインディゴ)
  // "不思議", "混乱", "驚", "謎"
  if (["不思議", "混乱", "驚", "謎"].some((k) => label.includes(k))) {
    return "bg-indigo-500 text-white border-indigo-600";
  }

  // デフォルト (グレー)
  return "bg-slate-500 text-white border-slate-600";
};

export const EmotionTag: React.FC<EmotionTagProps> = ({
  label,
  className = "",
}) => {
  const colorClass = getColorClass(label);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass} ${className}`}
    >
      {label}
    </span>
  );
};
