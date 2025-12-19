import React from "react";

type EmotionTagProps = {
  label: string;
  className?: string;
};

export const getChildFriendlyEmotionLabel = (originalLabel: string): string => {
  // ポジティブ
  if (["楽し", "嬉し", "喜", "幸", "愛", "好", "希"].some(k => originalLabel.includes(k))) return "😊 うれしい";
  // ネガティブ (怒り)
  if (["怒", "腹立", "イライラ", "不満"].some(k => originalLabel.includes(k))) return "😡 おこってる";
  // ネガティブ (恐怖・不安)
  if (["怖", "恐", "不安", "焦", "苦", "痛", "悪夢", "緊"].some(k => originalLabel.includes(k))) return "😰 こわい";
  // ネガティブ (悲しみ)
  if (["悲", "寂", "孤独", "辛", "喪", "悔"].some(k => originalLabel.includes(k))) return "😢 かなしい";
  // リラックス
  if (["安", "穏", "癒", "平"].some(k => originalLabel.includes(k))) return "😌 ほっとした";
  // 驚き
  if (["驚", "ショック"].some(k => originalLabel.includes(k))) return "😲 びっくり";
  // 不思議 / 混乱
  if (["不思議", "混乱", "謎"].some(k => originalLabel.includes(k))) return "😵 わからない";

  // そのまま返す (マッチしない場合) または デフォルト
  return originalLabel;
};

const getColorClass = (label: string): string => {
  // マッピング済みのラベル、または元のラベルで判定
  // ポジティブ
  if (label.includes("うれしい") || ["楽し", "嬉し", "喜", "幸", "愛", "好", "希"].some(k => label.includes(k))) {
    return "bg-orange-500 text-white border-orange-600";
  }
  // 怒り
  if (label.includes("おこってる") || ["怒", "腹立", "イライラ", "不満"].some(k => label.includes(k))) {
    return "bg-red-500 text-white border-red-600";
  }
  // 恐怖
  if (label.includes("こわい") || ["怖", "恐", "不安", "焦", "苦", "痛", "悪夢", "緊"].some(k => label.includes(k))) {
    return "bg-purple-600 text-white border-purple-700";
  }
  // 悲しみ
  if (label.includes("かなしい") || ["悲", "寂", "孤独", "辛", "喪", "悔"].some(k => label.includes(k))) {
    return "bg-blue-500 text-white border-blue-600";
  }
  // リラックス
  if (label.includes("ほっとした") || ["安", "穏", "癒", "平"].some(k => label.includes(k))) {
    return "bg-emerald-500 text-white border-emerald-600";
  }
  // 驚き
  if (label.includes("びっくり") || ["驚", "ショック"].some(k => label.includes(k))) {
    return "bg-yellow-500 text-white border-yellow-600";
  }
  // 不思議
  if (label.includes("わからない") || ["不思議", "混乱", "謎"].some(k => label.includes(k))) {
    return "bg-indigo-500 text-white border-indigo-600";
  }

  return "bg-slate-500 text-white border-slate-600";
};

export const EmotionTag: React.FC<EmotionTagProps> = ({
  label,
  className = "",
}) => {
  const displayLabel = getChildFriendlyEmotionLabel(label);
  const colorClass = getColorClass(displayLabel); // Use the display label for color mapping too if possible, or support both

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${colorClass} ${className}`}
    >
      {displayLabel}
    </span>
  );
};
