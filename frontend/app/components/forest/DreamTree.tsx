"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Dream, DreamProfile } from "@/app/types";
import { getGrowthLevel, getCanopyScale, RECENT_FRUIT_COUNT } from "@/lib/forest";
import DreamFruit from "./DreamFruit";

export default function DreamTree({
  profile,
  dreams,
}: {
  profile: DreamProfile;
  dreams: Dream[];
}) {
  const reduceMotion = useReducedMotion();
  const { level, name, emoji } = getGrowthLevel(dreams.length);
  const scale = getCanopyScale(level);
  const recent = dreams.slice(0, RECENT_FRUIT_COUNT); // 新しい順で先頭が最近

  return (
    <div className="relative mx-auto flex w-full max-w-md flex-col items-center">
      {/* 育ちレベル */}
      <span
        className="mb-3 rounded-full bg-black/40 px-3 py-1 text-xs text-amber-100"
        aria-live="polite"
      >
        {emoji} {name}・夢 {dreams.length}
      </span>

      {/* 茂み＋実 */}
      <motion.div
        className="relative"
        style={{ width: 280 * scale, height: 240 * scale }}
        animate={reduceMotion ? undefined : { rotate: [-1, 1, -1] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <div
          className="absolute inset-0 rounded-[48%]"
          style={{
            background: `radial-gradient(circle at 42% 38%, ${profile.color}dd, ${profile.color}66 65%, transparent)`,
            boxShadow: `0 0 60px ${profile.color}55`,
          }}
        />
        {recent.map((d, i) => (
          <DreamFruit key={d.id} dream={d} index={i} profileColor={profile.color} />
        ))}
      </motion.div>

      {/* 幹 */}
      <div
        className="rounded-b bg-[#6b4a2b]"
        style={{ width: 16 + level * 3, height: 70 + level * 8 }}
      />
      <div className="h-2 w-40 rounded-full bg-[#2a2150]" />
    </div>
  );
}
