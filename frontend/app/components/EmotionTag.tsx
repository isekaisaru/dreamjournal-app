"use client";

import React from "react";
import { motion } from "framer-motion";

type EmotionTagProps = {
  label: string;
  className?: string;
};

export const getChildFriendlyEmotionLabel = (originalLabel: string): string => {
  // ポジティブ (うれしい)
  // ポジティブ (たのしい) - うれしいから分離
  if (["楽し"].some((k) => originalLabel.includes(k))) return "😆 たのしい";

  // ポジティブ (うれしい)
  if (
    ["嬉し", "喜", "幸", "愛", "好", "希"].some((k) =>
      originalLabel.includes(k)
    )
  )
    return "😊 うれしい";

  // 感動 (じーんとした)
  if (["感動", "感激", "胸が"].some((k) => originalLabel.includes(k)))
    return "🥺 じーんとした";

  // ネガティブ (怒り)
  if (["怒", "腹立", "イライラ", "不満"].some((k) => originalLabel.includes(k)))
    return "😡 おこってる";

  // ネガティブ (恐怖)
  if (["怖", "恐", "悪夢"].some((k) => originalLabel.includes(k)))
    return "😰 こわい";

  // ネガティブ (不安・苦しい)
  if (["不安", "焦", "苦", "痛", "緊"].some((k) => originalLabel.includes(k)))
    return "😓 しんぱい";

  // ネガティブ (悲しみ)
  if (
    ["悲", "寂", "孤独", "辛", "喪", "悔"].some((k) =>
      originalLabel.includes(k)
    )
  )
    return "😢 かなしい";

  // リラックス
  if (["安", "穏", "癒", "平"].some((k) => originalLabel.includes(k)))
    return "😌 ほっとした";

  // 驚き
  if (["驚", "ショック"].some((k) => originalLabel.includes(k)))
    return "😲 びっくり";

  // 不思議 / 混乱
  if (["不思議", "混乱", "謎"].some((k) => originalLabel.includes(k)))
    return "😵 わからない";

  // マッチしない場合は、デフォルトで「😊 うれしい」などにはせず、
  // 元のラベルがポジティブに近いか判定できないため、そのまま返すか
  // もしくは「その他」などにマッピングする。
  // ここでは「うれしい」が2つ出る現象を防ぐため、上記ロジックでカバーされないものはそのまま返す。
  return originalLabel;
};

type EmotionTone = {
  chipClassName: string;
  accentClassName: string;
};

export const getEmotionTone = (label: string): EmotionTone => {
  // ポジティブ
  // ポジティブ (オレンジ)
  if (
    label.includes("うれしい") ||
    ["嬉し", "喜", "幸", "愛", "好", "希"].some((k) => label.includes(k))
  ) {
    return {
      chipClassName: "bg-orange-500 text-white border-orange-600",
      accentClassName: "from-orange-400 via-amber-300 to-orange-500",
    };
  }
  // たのしい (琥珀色/黄色寄り)
  if (label.includes("たのしい") || ["楽し"].some((k) => label.includes(k))) {
    return {
      chipClassName: "bg-amber-500 text-white border-amber-600",
      accentClassName: "from-amber-300 via-yellow-200 to-amber-500",
    };
  }
  // 感動 (ピンク/ローズ系)
  if (
    label.includes("じーんとした") ||
    ["感動", "感激"].some((k) => label.includes(k))
  ) {
    return {
      chipClassName: "bg-rose-500 text-white border-rose-600",
      accentClassName: "from-rose-300 via-pink-200 to-rose-500",
    };
  }
  // 怒り
  if (
    label.includes("おこってる") ||
    ["怒", "腹立", "イライラ", "不満"].some((k) => label.includes(k))
  ) {
    return {
      chipClassName: "bg-red-500 text-white border-red-600",
      accentClassName: "from-red-400 via-rose-300 to-red-600",
    };
  }
  // 恐怖 (紫)
  if (
    label.includes("こわい") ||
    ["怖", "恐", "悪夢"].some((k) => label.includes(k))
  ) {
    return {
      chipClassName: "bg-purple-600 text-white border-purple-700",
      accentClassName: "from-violet-400 via-purple-300 to-violet-700",
    };
  }
  // 不安 (少し薄い紫 or 紺)
  if (
    label.includes("しんぱい") ||
    ["不安", "焦", "苦", "痛", "緊"].some((k) => label.includes(k))
  ) {
    return {
      chipClassName: "bg-indigo-400 text-white border-indigo-500",
      accentClassName: "from-indigo-300 via-sky-200 to-indigo-500",
    };
  }
  // 悲しみ (青)
  if (
    label.includes("かなしい") ||
    ["悲", "寂", "孤独", "辛", "喪", "悔"].some((k) => label.includes(k))
  ) {
    return {
      chipClassName: "bg-blue-500 text-white border-blue-600",
      accentClassName: "from-sky-300 via-blue-200 to-blue-500",
    };
  }
  // リラックス (緑)
  if (
    label.includes("ほっとした") ||
    ["安", "穏", "癒", "平"].some((k) => label.includes(k))
  ) {
    return {
      chipClassName: "bg-emerald-500 text-white border-emerald-600",
      accentClassName: "from-emerald-300 via-lime-200 to-emerald-500",
    };
  }
  // 驚き (黄色)
  if (
    label.includes("びっくり") ||
    ["驚", "ショック"].some((k) => label.includes(k))
  ) {
    return {
      chipClassName: "bg-yellow-500 text-white border-yellow-600",
      accentClassName: "from-yellow-300 via-amber-200 to-yellow-500",
    };
  }
  // 不思議 (インディゴ/グレー)
  if (
    label.includes("わからない") ||
    ["不思議", "混乱", "謎"].some((k) => label.includes(k))
  ) {
    return {
      chipClassName: "bg-slate-500 text-white border-slate-600",
      accentClassName: "from-slate-300 via-slate-200 to-slate-500",
    };
  }

  return {
    chipClassName: "bg-slate-500 text-white border-slate-600",
    accentClassName: "from-slate-300 via-slate-200 to-slate-500",
  };
};

export const EmotionTag: React.FC<EmotionTagProps> = ({
  label,
  className = "",
}) => {
  // Check if already mapped (starts with emoji or matches known output) to avoid double processing if passed pre-mapped
  const isAlreadyMapped = [
    "😊",
    "🥺",
    "😡",
    "😰",
    "😓",
    "😢",
    "😌",
    "😲",
    "😵",
  ].some((emoji) => label.startsWith(emoji));
  const displayLabel = isAlreadyMapped
    ? label
    : getChildFriendlyEmotionLabel(label);
  const colorClass = getEmotionTone(displayLabel).chipClassName;

  return (
    <motion.span
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -1, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${colorClass} ${className}`}
    >
      {displayLabel}
    </motion.span>
  );
};
