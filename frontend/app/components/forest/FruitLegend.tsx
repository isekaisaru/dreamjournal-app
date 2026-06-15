"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const LEGEND_ROWS = [
  ["#fbbf24", "うれしい・たのしい"],
  ["#34d399", "あんしん・しあわせ"],
  ["#22d3ee", "きたい・ふしぎ"],
  ["#60a5fa", "かなしい"],
  ["#f87171", "こわい・おこり"],
  ["#a78bfa", "おどろき"],
] as const;

/**
 * 実の色 = 感情タグ の凡例。詳細画面（/forest/:id）の左上に配置する。
 * 「みの いろって？」トグルで展開。YumeTree 独自の感情タグ機能と
 * 視覚的につながり、子どもに意味を教えられる。
 */
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
            className="mt-2 w-48 rounded-2xl border border-white/20 bg-[rgba(14,14,36,0.92)] p-3 backdrop-blur-xl"
          >
            <p className="mb-2 text-[12px] leading-relaxed text-white/70">
              みの いろは、ゆめの{" "}
              <b className="text-white">きもち</b> を あらわしているよ。
            </p>
            <div className="flex flex-col gap-1.5">
              {LEGEND_ROWS.map(([color, label]) => (
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
