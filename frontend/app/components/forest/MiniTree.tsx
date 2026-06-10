"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { DreamProfile } from "@/app/types";
import { getGrowthLevel, getCanopyScale } from "@/lib/forest";

export default function MiniTree({ profile }: { profile: DreamProfile }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const count = profile.dreams_count ?? 0;
  const { level, name } = getGrowthLevel(count);
  const scale = getCanopyScale(level);

  return (
    <motion.button
      type="button"
      onClick={() => router.push(`/forest/${profile.id}`)}
      className="relative flex flex-col items-center justify-end rounded-2xl px-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.97 }}
      aria-label={`${profile.name} の木（夢 ${count} 件・${name}）を見る`}
    >
      {/* 茂み（ゆっくり呼吸するように揺れる） */}
      <motion.div
        className="rounded-full"
        style={{
          width: 96 * scale,
          height: 96 * scale,
          background: `radial-gradient(circle at 40% 35%, ${profile.color}cc, ${profile.color}55 70%, transparent)`,
          boxShadow: `0 0 28px ${profile.color}55`,
        }}
        animate={reduceMotion ? undefined : { scale: [1, 1.04, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <span
          className="flex h-full w-full items-center justify-center text-2xl"
          aria-hidden
        >
          {profile.avatar_emoji}
        </span>
      </motion.div>
      {/* 幹 */}
      <div
        className="w-2.5 rounded-b-sm bg-[#6b4a2b]"
        style={{ height: 18 + level * 4 }}
      />
      {/* 名前と件数 */}
      <span className="mt-1 text-xs font-semibold text-foreground/90">
        {profile.name}
      </span>
      <span className="text-[10px] text-muted-foreground">夢 {count}</span>
    </motion.button>
  );
}
