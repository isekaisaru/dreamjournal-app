"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { Dream } from "@/app/types";
import { fruitPosition, fruitColor } from "@/lib/forest";

export default function DreamFruit({
  dream,
  index,
  profileColor,
}: {
  dream: Dream;
  index: number;
  profileColor: string;
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const pos = fruitPosition(dream.id, index);
  const color = fruitColor(dream, profileColor);

  return (
    <motion.button
      type="button"
      onClick={() => router.push(`/dream/${dream.id}`)}
      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      style={{
        left: `${pos.xPct}%`,
        top: `${pos.yPct}%`,
        width: 18,
        height: 18,
        background: color,
        boxShadow: `0 0 10px 2px ${color}`,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={
        reduceMotion
          ? { scale: 1, opacity: 1 }
          : { scale: [1, 1.18, 1], opacity: 1 }
      }
      transition={{
        scale: { duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: index * 0.12 },
        opacity: { duration: 0.4, delay: index * 0.05 },
      }}
      whileHover={{ scale: 1.5 }}
      whileTap={{ scale: 0.85 }}
      aria-label={`夢「${dream.title}」を開く`}
    />
  );
}
