"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import MorpheusSVG, { type MorpheusExpression } from "./MorpheusSVG";

export type MorpheusImageVariant =
  | "home"
  | "compose"
  | "voice"
  | "analysis"
  | "empty"
  | "praise";

const MORPHEUS_IMAGE_SRC: Record<MorpheusImageVariant, string> = {
  home: "/images/morpheus/morpheus-home.jpg",
  compose: "/images/morpheus/morpheus-compose.jpg",
  voice: "/images/morpheus/morpheus-voice.jpg",
  analysis: "/images/morpheus/morpheus-analysis.jpg",
  empty: "/images/morpheus/morpheus-empty.jpg",
  praise: "/images/morpheus/morpheus-praise.jpg",
};

const ALT_BY_VARIANT: Record<MorpheusImageVariant, string> = {
  home: "ホーム画面で見守るモルペウス",
  compose: "夢を書く場面で応援するモルペウス",
  voice: "マイクの前で夢の話を聞いているモルペウス",
  analysis: "夢の本を読んで分析しているモルペウス",
  empty: "月と雲の上で次の夢を待っているモルペウス",
  praise: "星を掲げて夢の記録をほめるモルペウス",
};

// 画像が読み込めなかった場合に表示する SVG の表情
const FALLBACK_EXPRESSION: Record<MorpheusImageVariant, MorpheusExpression> = {
  home: "cheerful",
  compose: "dreaming",
  voice: "curious",
  analysis: "curious",
  empty: "sleeping",
  praise: "proud",
};

type MorpheusImageProps = {
  variant?: MorpheusImageVariant;
  size?: number;
  className?: string;
  priority?: boolean;
};

export default function MorpheusImage({
  variant = "home",
  size = 180,
  className = "",
  priority = false,
}: MorpheusImageProps) {
  const [hasImageError, setHasImageError] = useState(false);

  if (hasImageError) {
    return (
      <MorpheusSVG
        expression={FALLBACK_EXPRESSION[variant]}
        size={size}
        className={className}
      />
    );
  }

  return (
    <motion.img
      src={MORPHEUS_IMAGE_SRC[variant]}
      alt={ALT_BY_VARIANT[variant]}
      width={size}
      height={size}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() => setHasImageError(true)}
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
      className={`object-contain drop-shadow-[0_18px_40px_rgba(99,102,241,0.30)] ${className}`}
    />
  );
}
