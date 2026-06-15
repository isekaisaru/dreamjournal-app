"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EMOTION_COLORS } from "@/lib/forest";

// EMOTION_COLORS のキーに対応するひらがな読み
const READINGS: Record<string, string> = {
  喜び: "よろこび",
  楽しい: "たのしい",
  幸せ: "しあわせ",
  愛: "あい",
  安心: "あんしん",
  期待: "きたい",
  驚き: "おどろき",
  悲しい: "かなしい",
  不安: "ふあん",
  怒り: "おこり",
  恐怖: "こわい",
  混乱: "こんらん",
};

const LEGEND_ROWS = Object.entries(EMOTION_COLORS).map(([name, color]) => ({
  color,
  label: READINGS[name] ?? name,
}));

export default function FruitLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute left-4 top-14 z-[42]">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="fruit-legend-panel"
        className="flex items-center gap-1.5 rounded-full border border-white/20 bg-[rgba(12,12,32,0.6)] px-3 py-1.5 text-[12px] font-bold text-white/85 backdrop-blur-lg"
      >
        🍎 みの いろって？
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="fruit-legend-panel"
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="mt-2 max-h-[60vh] w-48 overflow-y-auto rounded-2xl border border-white/20 bg-[rgba(14,14,36,0.92)] p-3 backdrop-blur-xl"
          >
            <p className="mb-2 text-[12px] leading-relaxed text-white/70">
              みの いろは、ゆめの{" "}
              <b className="text-white">きもち</b> を あらわしているよ。
            </p>
            <div className="flex flex-col gap-1.5">
              {LEGEND_ROWS.map(({ color, label }) => (
                <div key={color} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 flex-none rounded-full"
                    style={{
                      background: `radial-gradient(circle at 35% 30%, #fff, ${color})`,
                      boxShadow: `0 0 6px ${color}`,
                    }}
                  />
                  <span className="text-[12px] text-white/80">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
