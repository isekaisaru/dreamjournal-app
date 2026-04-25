"use client";

import { motion } from "framer-motion";

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
  home: "手を振って夢の記録へ案内するモルペウス",
  compose: "夢のノートを開いて書くことを応援するモルペウス",
  voice: "マイクの前で夢の話を聞いているモルペウス",
  analysis: "夢の本を読んで分析しているモルペウス",
  empty: "月と雲の上で次の夢を待っているモルペウス",
  praise: "星を掲げて夢の記録をほめるモルペウス",
};

type MorpheusImageProps = {
  variant?: MorpheusImageVariant;
  size?: number;
  className?: string;
  priority?: boolean;
};

/**
 * 添付されたモルペウス画像を画面別に表示する共通コンポーネント。
 *
 * 画像ファイルは frontend/public/images/morpheus/ に配置する。
 * SVG版のモルペウスより大きく、生成画像の可愛さをそのまま画面へ出す用途。
 */
export default function MorpheusImage({
  variant = "home",
  size = 180,
  className = "",
  priority = false,
}: MorpheusImageProps) {
  return (
    <motion.img
      src={MORPHEUS_IMAGE_SRC[variant]}
      alt={ALT_BY_VARIANT[variant]}
      width={size}
      height={size}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
      className={`object-contain drop-shadow-[0_18px_40px_rgba(99,102,241,0.30)] ${className}`}
    />
  );
}
