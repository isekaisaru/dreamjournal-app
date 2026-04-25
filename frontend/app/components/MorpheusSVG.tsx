"use client";

import { motion, type TargetAndTransition } from "framer-motion";

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

function Eyes({ expression }: { expression: MorpheusExpression }) {
  switch (expression) {
    case "cheerful":
      return (
        <>
          <circle cx="33" cy="43" r="4.5" fill="#1e293b" />
          <circle cx="47" cy="43" r="4.5" fill="#1e293b" />
          <circle cx="35" cy="41" r="1.8" fill="white" />
          <circle cx="49" cy="41" r="1.8" fill="white" />
          <circle cx="34.5" cy="44.5" r="0.8" fill="white" />
          <circle cx="48.5" cy="44.5" r="0.8" fill="white" />
        </>
      );
    case "curious":
      return (
        <>
          <circle cx="33" cy="43" r="5" fill="#1e293b" />
          <circle cx="47" cy="44" r="3.5" fill="#1e293b" />
          <circle cx="35" cy="41" r="1.8" fill="white" />
          <circle cx="49" cy="42" r="1.4" fill="white" />
        </>
      );
    case "dreaming":
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
          <text x="54" y="36" fontSize="7" fill="#94a3b8" fontWeight="bold" fontFamily="sans-serif">
            z
          </text>
          <text x="58" y="30" fontSize="9" fill="#94a3b8" fontWeight="bold" fontFamily="sans-serif">
            Z
          </text>
        </>
      );
    case "proud":
      return (
        <>
          <ellipse cx="33" cy="44" rx="4.5" ry="3" fill="#1e293b" />
          <ellipse cx="47" cy="44" rx="4.5" ry="3" fill="#1e293b" />
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
    case "proud":
      return (
        <path
          d="M 35 57 Q 40 61 45 57"
          stroke="#92400e"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
      );
    default:
      return (
        <path
          d="M 36 57 Q 40 59 44 57"
          stroke="#92400e"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      );
  }
}

const floatVariants: Record<MorpheusExpression, TargetAndTransition> = {
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
  const wingGlow =
    expression === "proud"
      ? "rgba(167,139,250,0.22)"
      : expression === "dreaming"
        ? "rgba(147,197,253,0.18)"
        : "rgba(245,243,255,0.15)";
  const wingFill = expression === "proud" ? "#f0ecff" : "#f8f5ff";
  const featherColor = expression === "proud" ? "#c4b5fd" : "#ddd6fe";

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
        overflow="visible"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* ====== ANGEL WINGS (behind body) ====== */}

        {/* Left wing glow */}
        <ellipse cx="4" cy="38" rx="18" ry="26" fill={wingGlow} style={{ filter: "blur(4px)" }} />
        {/* Left wing main */}
        <path
          d="M 18 62 C 2 58, -5 42, -2 24 C 3 30, 8 46, 18 62 Z"
          fill={wingFill}
          opacity="0.95"
        />
        {/* Left wing upper lobe */}
        <path
          d="M 18 50 C 6 44, 2 30, 8 16 C 12 26, 15 40, 18 50 Z"
          fill={wingFill}
          opacity="0.88"
        />
        {/* Left feather lines */}
        <path d="M -2 24 C 4 36, 10 50, 18 62" stroke={featherColor} strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.7" />
        <path d="M 8 16 C 11 30, 14 44, 18 50" stroke={featherColor} strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.7" />
        <path d="M 2 20 C 6 32, 11 46, 18 56" stroke={featherColor} strokeWidth="0.7" fill="none" strokeLinecap="round" opacity="0.5" />
        {/* Left wing highlight */}
        <path d="M 17 60 C 3 52, -1 38, 2 22" stroke="white" strokeWidth="1.6" fill="none" opacity="0.5" strokeLinecap="round" />

        {/* Right wing glow */}
        <ellipse cx="76" cy="38" rx="18" ry="26" fill={wingGlow} style={{ filter: "blur(4px)" }} />
        {/* Right wing main */}
        <path
          d="M 62 62 C 78 58, 85 42, 82 24 C 77 30, 72 46, 62 62 Z"
          fill={wingFill}
          opacity="0.95"
        />
        {/* Right wing upper lobe */}
        <path
          d="M 62 50 C 74 44, 78 30, 72 16 C 68 26, 65 40, 62 50 Z"
          fill={wingFill}
          opacity="0.88"
        />
        {/* Right feather lines */}
        <path d="M 82 24 C 76 36, 70 50, 62 62" stroke={featherColor} strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.7" />
        <path d="M 72 16 C 69 30, 66 44, 62 50" stroke={featherColor} strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.7" />
        <path d="M 78 20 C 74 32, 69 46, 62 56" stroke={featherColor} strokeWidth="0.7" fill="none" strokeLinecap="round" opacity="0.5" />
        {/* Right wing highlight */}
        <path d="M 63 60 C 77 52, 81 38, 78 22" stroke="white" strokeWidth="1.6" fill="none" opacity="0.5" strokeLinecap="round" />

        {/* ====== BODY (over wings) ====== */}

        {/* Wool */}
        <circle cx="40" cy="46" r="27" fill="white" />
        <circle cx="18" cy="40" r="11" fill="white" />
        <circle cx="62" cy="40" r="11" fill="white" />
        <circle cx="28" cy="24" r="11" fill="white" />
        <circle cx="52" cy="24" r="11" fill="white" />
        <circle cx="40" cy="20" r="10" fill="white" />

        {/* Golden horns */}
        <path
          d="M 24 34 C 12 26 8 14 18 12 C 28 10 28 22 22 28"
          stroke="#d97706"
          strokeWidth="4.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 56 34 C 68 26 72 14 62 12 C 52 10 52 22 58 28"
          stroke="#d97706"
          strokeWidth="4.5"
          fill="none"
          strokeLinecap="round"
        />
        {/* Horn highlights */}
        <path d="M 22 30 C 14 24 11 16 17 13" stroke="#fbbf24" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.7" />
        <path d="M 58 30 C 66 24 69 16 63 13" stroke="#fbbf24" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.7" />

        {/* Cream face */}
        <ellipse cx="40" cy="48" rx="20" ry="18" fill="#fef3c7" />

        {/* Eyes */}
        <Eyes expression={expression} />

        {/* Nose */}
        <ellipse cx="40" cy="54" rx="5.5" ry="3.5" fill="#fca5a5" />
        <circle cx="38" cy="53" r="1.2" fill="#f87171" />
        <circle cx="42" cy="53" r="1.2" fill="#f87171" />

        {/* Mouth */}
        <Mouth expression={expression} />

        {/* Ears */}
        <ellipse cx="20" cy="42" rx="5" ry="7" fill="#fde68a" transform="rotate(-15 20 42)" />
        <ellipse cx="60" cy="42" rx="5" ry="7" fill="#fde68a" transform="rotate(15 60 42)" />
        <ellipse cx="20" cy="42" rx="2.5" ry="4" fill="#fca5a5" transform="rotate(-15 20 42)" />
        <ellipse cx="60" cy="42" rx="2.5" ry="4" fill="#fca5a5" transform="rotate(15 60 42)" />

        {/* ====== Halo ====== */}
        <ellipse
          cx="40"
          cy="10"
          rx="10"
          ry="3"
          fill="none"
          stroke="#fbbf24"
          strokeWidth="2"
          opacity="0.75"
          style={{ filter: "drop-shadow(0 0 3px rgba(251,191,36,0.8))" }}
        />
      </svg>
    </motion.div>
  );
}
