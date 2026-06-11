"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { DreamProfile } from "@/app/types";
import MiniTree from "./MiniTree";

/** 星をランダムだが固定の位置でちりばめる（再描画で動かないよう定数化） */
const STARS = Array.from({ length: 40 }, (_, i) => ({
  left: (i * 53) % 100,
  top: (i * 37) % 70,
  delay: (i % 7) * 0.4,
  size: (i % 3) + 1,
}));

export default function ForestScene({ profiles }: { profiles: DreamProfile[] }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative min-h-[70vh] overflow-hidden rounded-3xl bg-gradient-to-b from-[#241a40] via-[#1a1336] to-[#0e0a1c]">
      {/* 星空 */}
      {STARS.map((s, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size }}
          animate={reduceMotion ? undefined : { opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, delay: s.delay }}
        />
      ))}
      {/* 月 */}
      <div className="absolute right-8 top-8 h-16 w-16 rounded-full bg-[#fef3c7] shadow-[0_0_50px_20px_rgba(254,243,199,0.35)]" />

      {/* 地面 */}
      <div className="absolute bottom-0 h-28 w-full bg-gradient-to-t from-[#2a2150] to-transparent" />

      {/* 木を並べる */}
      <div className="relative z-10 flex flex-wrap items-end justify-center gap-6 px-6 pb-16 pt-24">
        {profiles.map((p) => (
          <MiniTree key={p.id} profile={p} />
        ))}
      </div>
    </div>
  );
}
