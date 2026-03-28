"use client";

import Image from "next/image";
import { motion } from "framer-motion";

interface MorpheusSmallProps {
  /** 吹き出しのメインメッセージ */
  message: string;
  /** 吹き出しのタイトル（任意） */
  title?: string;
  /** 画像サイズ: sm=48px / md=64px (デフォルト md) */
  size?: "sm" | "md";
  /** レイアウト方向: "row"=左吹き出し+右画像 / "col"=上画像+下吹き出し（デフォルト row） */
  layout?: "row" | "col";
  /** 追加のラッパー className */
  className?: string;
}

/**
 * モルペウスの小型バージョン
 * dream/new, trial, donation など各ページのインラインガイドとして使用
 */
export default function MorpheusSmall({
  message,
  title,
  size = "md",
  layout = "row",
  className = "",
}: MorpheusSmallProps) {
  const imgPx = size === "sm" ? 48 : 64;

  if (layout === "col") {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        <Image
          src="/images/morpheus.png"
          alt="モルペウス"
          width={imgPx}
          height={imgPx}
          sizes={`${imgPx}px`}
          className="opacity-90 drop-shadow-[0_4px_12px_rgba(56,189,248,0.3)]"
        />
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative bg-slate-800/90 border border-slate-700/60 rounded-2xl px-4 py-3 shadow-md text-center"
        >
          {title && (
            <p className="text-xs font-bold text-sky-300 mb-1">{title}</p>
          )}
          <p className="text-sm text-slate-200 leading-relaxed">{message}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`flex items-end gap-3 ${className}`}>
      {/* 吹き出し（左） */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="relative flex-1 bg-slate-800/90 border border-slate-700/60 rounded-2xl rounded-br-sm px-4 py-3 shadow-md"
      >
        {title && (
          <p className="text-xs font-bold text-sky-300 mb-1">{title}</p>
        )}
        <p className="text-sm text-slate-200 leading-relaxed">{message}</p>
        {/* 吹き出しのしっぽ（右向き） */}
        <div className="absolute -right-2 bottom-3 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[8px] border-l-slate-800/90" />
      </motion.div>

      {/* モルペウス画像（右） */}
      <div className="flex-shrink-0">
        <Image
          src="/images/morpheus.png"
          alt="モルペウス"
          width={imgPx}
          height={imgPx}
          sizes={`${imgPx}px`}
          className="opacity-90 drop-shadow-[0_4px_12px_rgba(56,189,248,0.3)]"
        />
      </div>
    </div>
  );
}
