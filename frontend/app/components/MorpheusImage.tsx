"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import MorpheusSVG, { type MorpheusExpression } from "./MorpheusSVG";
import {
  MORPHEUS_IMAGE_SRC,
  ALT_BY_VARIANT,
  type MorpheusImageVariant,
} from "./morpheusAssets";

export type { MorpheusImageVariant };

// 画像が読み込めなかった場合に表示する SVG の表情
const FALLBACK_EXPRESSION: Record<MorpheusImageVariant, MorpheusExpression> = {
  home: "cheerful",
  compose: "dreaming",
  voice: "curious",
  analysis: "curious",
  empty: "sleeping",
  praise: "proud",
  landing: "cheerful",
  login: "cheerful",
  search: "curious",
  settings: "cheerful",
  reward: "proud",
};

type MorpheusImageProps = {
  variant?: MorpheusImageVariant;
  size?: number;
  cssSize?: string;
  className?: string;
  priority?: boolean;
};

export default function MorpheusImage({
  variant = "home",
  size,
  cssSize,
  className = "",
  priority = false,
}: MorpheusImageProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const intrinsicSize = cssSize ? size ?? 320 : size ?? 180;
  const responsiveStyle = cssSize
    ? { width: cssSize, height: cssSize }
    : undefined;

  useEffect(() => {
    setHasImageError(false);
  }, [variant]);

  if (hasImageError) {
    if (cssSize) {
      return (
        <div style={responsiveStyle} className={className}>
          <MorpheusSVG
            expression={FALLBACK_EXPRESSION[variant]}
            size={intrinsicSize}
            className="h-full w-full"
          />
        </div>
      );
    }

    return (
      <MorpheusSVG
        expression={FALLBACK_EXPRESSION[variant]}
        size={intrinsicSize}
        className={className}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
      className={`drop-shadow-[0_18px_40px_rgba(99,102,241,0.30)] ${className}`}
    >
      <Image
        src={MORPHEUS_IMAGE_SRC[variant]}
        alt={ALT_BY_VARIANT[variant]}
        width={intrinsicSize}
        height={intrinsicSize}
        priority={priority}
        onError={() => setHasImageError(true)}
        className="object-contain block"
        style={responsiveStyle}
        sizes={cssSize ?? `${intrinsicSize}px`}
      />
    </motion.div>
  );
}
