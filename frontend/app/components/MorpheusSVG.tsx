"use client";

import { motion } from "framer-motion";

export type MorpheusExpression =
  | "cheerful"
  | "curious"
  | "dreaming"
  | "proud"
  | "sleeping";

interface MorpheusSVGProps {
  expression?: MorpheusExpression;
  size?: number;
  className?: string;
}

// 目のパーツ（表情ごと）
function Eyes({ expression }: { expression: MorpheusExpression }) {
  switch (expression) {
    case "cheerful":
      return (
        <>
          <circle cx="33" cy="43" r="4.5" fill="#1e293b" />
          <circle cx="47" cy="43" r="4.5" fill="#1e293b" />
          {/* キラキラ */}
          <circle cx="35" cy="41" r="1.8" fill="white" />
          <circle cx="49" cy="41" r="1.8" fill="white" />
          <circle cx="34.5" cy="44.5" r="0.8" fill="white" />
          <circle cx="48.5" cy="44.5" r="0.8" fill="white" />
        </>
      );
    case "curious":
      // 左目が少し大きく、首をかしげた印象
      return (
        <>
          <circle cx="33" cy="43" r="5" fill="#1e293b" />
          <circle cx="47" cy="44" r="3.5" fill="#1e293b" />
          <circle cx="35" cy="41" r="1.8" fill="white" />
          <circle cx="49" cy="42" r="1.4" fill="white" />
        </>
      );
    case "dreaming":
      // 目を閉じた曲線（夢を見ている）
      return (
        <>
          <path
            d="M 29 43 Q 33 40 37 43"
            stroke="#1e293b"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 43 43 Q 47 40 51 43"
            stroke="#1e293b"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          {/* Zzz */}
          <text x="54" y="36" fontSize="7" fill="#94a3b8" fontWeight="bold" fontFamily="sans-serif">
            z
          </text>
          <text x="58" y="30" fontSize="9" fill="#94a3b8" fontWeight="bold" fontFamily="sans-serif">
            Z
          </text>
        </>
      );
    case "proud":
      // 半目（目を細めた誇らしげな表情）
      return (
        <>
          <ellipse cx="33" cy="44" rx="4.5" ry="3" fill="#1e293b" />
          <ellipse cx="47" cy="44" rx="4.5" ry="3" fill="#1e293b" />
          {/* まぶた */}
          <path
            d="M 28.5 43 Q 33 40 37.5 43"
            stroke="#fef3c7"
            strokeWidth="2.5"
            fill="none"
          />
          <path
            d="M 42.5 43 Q 47 40 51.5 43"
            stroke="#fef3c7"
            strokeWidth="2.5"
            fill="none"
          />
          <circle cx="35" cy="43" r="1.2" fill="white" />
          <circle cx="49" cy="43" r="1.2" fill="white" />
        </>
      );
    case "sleeping":
    default:
      // しっかり閉じた目
      return (
        <>
          <path
            d="M 29 43 Q 33 40 37 43"
            stroke="#1e293b"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 43 43 Q 47 40 51 43"
            stroke="#1e293b"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          {/* まつ毛 */}
          <line x1="30" y1="43" x2="29" y2="41" stroke="#1e293b" strokeWidth="1.2" />
          <line x1="33" y1="40.5" x2="33" y2="38" stroke="#1e293b" strokeWidth="1.2" />
          <line x1="36" y1="43" x2="37" y2="41" stroke="#1e293b" strokeWidth="1.2" />
          <line x1="44" y1="43" x2="43" y2="41" stroke="#1e293b" strokeWidth="1.2" />
          <line x1="47" y1="40.5" x2="47" y2="38" stroke="#1e293b" strokeWidth="1.2" />
          <line x1="50" y1="43" x2="51" y2="41" stroke="#1e293b" strokeWidth="1.2" />
        </>
      );
  }
}

// 口のパーツ（表情ごと）
function Mouth({ expression }: { expression: MorpheusExpression }) {
  switch (expression) {
    case "cheerful":
      return (
        <path
          d="M 34 57 Q 40 63 46 57"
          stroke="#92400e"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      );
    case "curious":
      return (
        <path
          d="M 35 57 Q 40 61 45 57"
          stroke="#92400e"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
      );
    case "dreaming":
    case "sleeping":
      return (
        <path
          d="M 36 57 Q 40 59 44 57"
          stroke="#92400e"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      );
    case "proud":
    default:
      return (
        <path
          d="M 35 57 Q 40 61 45 57"
          stroke="#92400e"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
      );
  }
}

// 表情ごとの浮遊アニメーション設定
const floatVariants: Record<MorpheusExpression, object> = {
  cheerful: {
    y: [0, -6, 0],
    rotate: [-1, 1, -1],
    transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
  },
  curious: {
    y: [0, -4, 0],
    rotate: [-3, 0, -3],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
  },
  dreaming: {
    y: [0, -8, 0],
    rotate: [0, 1, 0],
    transition: { duration: 5, repeat: Infinity, ease: "easeInOut" },
  },
  proud: {
    y: [0, -5, 0],
    rotate: [0, 0, 0],
    transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
  },
  sleeping: {
    y: [0, -3, 0],
    transition: { duration: 6, repeat: Infinity, ease: "easeInOut" },
  },
};

export default function MorpheusSVG({
  expression = "cheerful",
  size = 80,
  className = "",
}: MorpheusSVGProps) {
  return (
    <motion.div
      animate={floatVariants[expression]}
      style={{ display: "inline-block" }}
      className={className}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* ====== 毛並み（外側のふわふわ） ====== */}
        <circle cx="40" cy="46" r="27" fill="white" />
        <circle cx="18" cy="40" r="11" fill="white" />
        <circle cx="62" cy="40" r="11" fill="white" />
        <circle cx="28" cy="24" r="11" fill="white" />
        <circle cx="52" cy="24" r="11" fill="white" />
        <circle cx="40" cy="20" r="10" fill="white" />

        {/* ====== 角（金色のカールした雄羊の角） ====== */}
        {/* 左角 */}
        <path
          d="M 24 34 C 12 26 8 14 18 12 C 28 10 28 22 22 28"
          stroke="#d97706"
          strokeWidth="4.5"
          fill="none"
          strokeLinecap="round"
        />
        {/* 右角 */}
        <path
          d="M 56 34 C 68 26 72 14 62 12 C 52 10 52 22 58 28"
          stroke="#d97706"
          strokeWidth="4.5"
          fill="none"
          strokeLinecap="round"
        />
        {/* 角のハイライト */}
        <path
          d="M 22 30 C 14 24 11 16 17 13"
          stroke="#fbbf24"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M 58 30 C 66 24 69 16 63 13"
          stroke="#fbbf24"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          opacity="0.7"
        />

        {/* ====== 顔（クリーム色） ====== */}
        <ellipse cx="40" cy="48" rx="20" ry="18" fill="#fef3c7" />

        {/* ====== 目 ====== */}
        <Eyes expression={expression} />

        {/* ====== 鼻 ====== */}
        <ellipse cx="40" cy="54" rx="5.5" ry="3.5" fill="#fca5a5" />
        <circle cx="38" cy="53" r="1.2" fill="#f87171" />
        <circle cx="42" cy="53" r="1.2" fill="#f87171" />

        {/* ====== 口 ====== */}
        <Mouth expression={expression} />

        {/* ====== 耳 ====== */}
        <ellipse
          cx="20"
          cy="42"
          rx="5"
          ry="7"
          fill="#fde68a"
          transform="rotate(-15 20 42)"
        />
        <ellipse
          cx="60"
          cy="42"
          rx="5"
          ry="7"
          fill="#fde68a"
          transform="rotate(15 60 42)"
        />
        <ellipse
          cx="20"
          cy="42"
          rx="2.5"
          ry="4"
          fill="#fca5a5"
          transform="rotate(-15 20 42)"
        />
        <ellipse
          cx="60"
          cy="42"
          rx="2.5"
          ry="4"
          fill="#fca5a5"
          transform="rotate(15 60 42)"
        />
      </svg>
    </motion.div>
  );
}
