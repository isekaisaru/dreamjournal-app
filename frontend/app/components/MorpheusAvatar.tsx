"use client";

import Image from "next/image";

import {
  MORPHEUS_IMAGE_SRC,
  ALT_BY_VARIANT,
  type MorpheusImageVariant,
} from "./morpheusAssets";

type MorpheusAvatarProps = {
  variant: MorpheusImageVariant;
  size?: number;
  className?: string;
  priority?: boolean;
};

/**
 * Morpheus の顔を円形にクロップした小アバター。
 * 全身画像（正方形・顔は上部中央）を object-cover + scale で顔にズームする。
 * 後光は付けない（#0早見表「詳細＝後光なし」）。
 */
export default function MorpheusAvatar({
  variant,
  size = 56,
  className = "",
  priority = false,
}: MorpheusAvatarProps) {
  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={MORPHEUS_IMAGE_SRC[variant]}
        alt={ALT_BY_VARIANT[variant]}
        fill
        sizes={`${size}px`}
        priority={priority}
        className="object-cover"
        style={{ transform: "scale(2)", transformOrigin: "center 25%" }}
      />
    </span>
  );
}
