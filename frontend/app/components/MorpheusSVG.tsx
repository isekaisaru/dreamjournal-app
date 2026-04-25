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
  if (expression === "sleeping" || expression === "dreaming") {
    return (
      <>
        <path
          d="M 31 43 Q 35 40 39 43"
          stroke="#312e81"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 45 43 Q 49 40 53 43"
          stroke="#312e81"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
        {expression === "dreaming" && (
          <>
            <text x="57" y="34" fontSize="7" fill="#93c5fd" fontWeight="bold">
              z
            </text>
            <text x="61" y="28" fontSize="9" fill="#c4b5fd" fontWeight="bold">
              Z
            </text>
          </>
        )}
      </>
    );
  }

  if (expression === "proud") {
    return (
      <>
        <ellipse cx="35" cy="43" rx="4.8" ry="3.2" fill="#312e81" />
        <ellipse cx="49" cy="43" rx="4.8" ry="3.2" fill="#312e81" />
        <circle cx="36.8" cy="41.6" r="1.4" fill="#ffffff" />
        <circle cx="50.8" cy="41.6" r="1.4" fill="#ffffff" />
      </>
    );
  }

  return (
    <>
      <circle cx="35" cy="43" r={expression === "curious" ? 5.1 : 4.7} fill="#312e81" />
      <circle cx="49" cy={expression === "curious" ? 44 : 43} r={expression === "curious" ? 3.9 : 4.7} fill="#312e81" />
      <circle cx="36.8" cy="41" r="1.7" fill="#ffffff" />
      <circle cx="50.8" cy="41" r="1.7" fill="#ffffff" />
      <circle cx="34.2" cy="45" r="0.8" fill="#bfdbfe" />
      <circle cx="48.2" cy="45" r="0.8" fill="#bfdbfe" />
    </>
  );
}

function Mouth({ expression }: { expression: MorpheusExpression }) {
  if (expression === "sleeping" || expression === "dreaming") {
    return (
      <path
        d="M 38 55 Q 42 57 46 55"
        stroke="#92400e"
        strokeWidth="1.7"
        fill="none"
        strokeLinecap="round"
      />
    );
  }

  return (
    <path
      d="M 36 55 Q 42 61 48 55"
      stroke="#92400e"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
    />
  );
}

const floatVariants: Record<MorpheusExpression, TargetAndTransition> = {
  cheerful: {
    y: [0, -6, 0],
    rotate: [-1, 1, -1],
    transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
  },
  curious: {
    y: [0, -4, 0],
    rotate: [-3, 1, -3],
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
        viewBox="0 0 88 88"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="morpheusFace" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(42 44) rotate(90) scale(27 25)">
            <stop stopColor="#fff7ed" />
            <stop offset="1" stopColor="#fdebd3" />
          </radialGradient>
          <linearGradient id="morpheusHat" x1="27" y1="4" x2="71" y2="39" gradientUnits="userSpaceOnUse">
            <stop stopColor="#a5b4fc" />
            <stop offset="0.55" stopColor="#93c5fd" />
            <stop offset="1" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="morpheusHair" x1="17" y1="27" x2="67" y2="63" gradientUnits="userSpaceOnUse">
            <stop stopColor="#c4b5fd" />
            <stop offset="0.55" stopColor="#a5b4fc" />
            <stop offset="1" stopColor="#7dd3fc" />
          </linearGradient>
          <linearGradient id="morpheusCoat" x1="24" y1="55" x2="60" y2="87" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" />
            <stop offset="1" stopColor="#e0f2fe" />
          </linearGradient>
        </defs>

        <ellipse cx="44" cy="81" rx="25" ry="6" fill="#bae6fd" opacity="0.32" />

        <path
          d="M30 58 C20 62 15 69 15 76 C22 76 29 73 35 67"
          fill="#ffffff"
          stroke="#dbeafe"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M58 58 C68 62 73 69 73 76 C66 76 59 73 53 67"
          fill="#ffffff"
          stroke="#dbeafe"
          strokeWidth="2"
          strokeLinecap="round"
        />

        <path
          d="M25 61 C25 52 32 47 44 47 C56 47 63 52 63 61 L67 82 C60 86 51 87 44 87 C37 87 28 86 21 82 L25 61Z"
          fill="url(#morpheusCoat)"
          stroke="#c7d2fe"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M37 55 L44 83 L51 55" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" />
        <path d="M39 59 H49 L47 78 H41 L39 59Z" fill="#6366f1" opacity="0.85" />
        <path d="M44 57 L48 62 L44 67 L40 62 Z" fill="#fbbf24" />
        <circle cx="57" cy="66" r="4.4" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1.5" />
        <path d="M55.6 66.2 L57 67.5 L59.4 64.5" stroke="#6366f1" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />

        <path
          d="M18 43 C18 29 28 18 43 18 C58 18 69 29 69 43 C69 59 57 70 43 70 C29 70 18 59 18 43Z"
          fill="url(#morpheusHair)"
          stroke="#c4b5fd"
          strokeWidth="2"
        />
        <path d="M24 42 C28 34 33 31 39 29 C36 35 31 39 24 42Z" fill="#ddd6fe" opacity="0.88" />
        <path d="M50 28 C58 30 64 35 66 43 C59 41 54 37 50 28Z" fill="#bfdbfe" opacity="0.82" />

        <ellipse cx="42" cy="45" rx="22" ry="20" fill="url(#morpheusFace)" />
        <circle cx="27" cy="49" r="3.5" fill="#fda4af" opacity="0.65" />
        <circle cx="57" cy="49" r="3.5" fill="#fda4af" opacity="0.65" />

        <Eyes expression={expression} />
        <ellipse cx="42" cy="51" rx="2.2" ry="1.6" fill="#f9a8d4" />
        <Mouth expression={expression} />

        <path
          d="M26 24 C27 9 40 1 55 7 C71 13 75 30 69 45 C66 37 55 32 43 31 C34 30 28 28 26 24Z"
          fill="url(#morpheusHat)"
          stroke="#dbeafe"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M27 25 C35 31 53 32 67 42"
          stroke="#eef2ff"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.8"
        />
        <circle cx="70" cy="47" r="6" fill="#f5d0fe" stroke="#e9d5ff" strokeWidth="2" />

        <path
          d="M64 20 C59 25 60 34 68 37 C62 39 55 36 53 30 C51 24 56 18 64 20Z"
          fill="#fde68a"
          stroke="#f59e0b"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {["M40 10 L41.4 13.4 L45 13.7 L42.2 16 L43 19.5 L40 17.7 L37 19.5 L37.8 16 L35 13.7 L38.6 13.4 Z", "M55 16 L56 18.2 L58.4 18.5 L56.6 20.1 L57.1 22.5 L55 21.3 L52.9 22.5 L53.4 20.1 L51.6 18.5 L54 18.2 Z", "M62 29 L63 31.2 L65.4 31.5 L63.6 33.1 L64.1 35.5 L62 34.3 L59.9 35.5 L60.4 33.1 L58.6 31.5 L61 31.2 Z"].map((d) => (
          <path key={d} d={d} fill="#fde68a" opacity="0.9" />
        ))}

        <path
          d="M39 25 C42 18 49 20 50 26 C48 24 45 24 43 28 C41 31 36 30 34 27 C36 28 38 27 39 25Z"
          fill="#ddd6fe"
        />

        <path d="M9 73 C16 64 25 68 29 76 C23 79 15 79 9 73Z" fill="#e0f2fe" opacity="0.8" />
        <path d="M60 78 C66 69 77 70 81 79 C75 83 66 83 60 78Z" fill="#e0f2fe" opacity="0.8" />
      </svg>
    </motion.div>
  );
}
