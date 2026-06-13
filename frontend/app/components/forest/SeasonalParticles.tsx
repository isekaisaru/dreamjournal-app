"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Season } from "@/lib/forestAtmosphere";

const SEASON_EMOJI: Record<Season, string> = {
  spring: "🌸",
  summer: "🍃",
  autumn: "🍁",
  winter: "❄️",
};

// 夏はほたる（ForestScene側）が主役なので控えめにする。
const SEASON_COUNT: Record<Season, number> = {
  spring: 16,
  summer: 7,
  autumn: 16,
  winter: 18,
};

/**
 * 季節に応じて 🌸/🍃/🍁/❄️ をゆっくり舞い落とす装飾レイヤー。
 * 位置・速度は決定論的（再描画で動かない）。reduced-motion では落下を止め静止表示。
 *
 * @param behind true なら本文の背面（z-[1]）に置く。テキストが多いページ（単独ツリー）向け。
 *               既定 false は前面（z-[15]）で森シーンの木の手前に降らせる。
 */
export default function SeasonalParticles({
  season,
  behind = false,
}: {
  season: Season;
  behind?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const emoji = SEASON_EMOJI[season];
  const count = SEASON_COUNT[season];
  const layerClass = behind ? "z-[1]" : "z-[15]";

  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: (i * 61 + 7) % 96,
        size: 10 + ((i * 7) % 10), // 10〜19px
        duration: 7 + ((i * 13) % 6), // 7〜12秒
        delay: (i * 0.9) % 6,
        drift: ((i % 3) - 1) * 24, // -24/0/24px の横揺れ
        rotate: (i % 2 === 0 ? 1 : -1) * (20 + (i % 4) * 15),
      })),
    [count]
  );

  // reduced-motion: 落下を止め、上部に数個だけ静止表示
  if (reduceMotion) {
    return (
      <div
        className={`pointer-events-none absolute inset-0 overflow-hidden ${layerClass}`}
        aria-hidden="true"
      >
        {particles.slice(0, 5).map((p, i) => (
          <span
            key={i}
            className="absolute"
            style={{
              left: `${p.left}%`,
              top: `${8 + i * 6}%`,
              fontSize: p.size,
              opacity: 0.5,
            }}
          >
            {emoji}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${layerClass}`}
      aria-hidden="true"
    >
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="absolute"
          style={{ left: `${p.left}%`, fontSize: p.size }}
          initial={{ top: "-8%", x: 0, opacity: 0 }}
          animate={{
            top: "108%",
            x: [0, p.drift, 0],
            opacity: [0, 0.85, 0.85, 0],
            rotate: [0, p.rotate],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {emoji}
        </motion.span>
      ))}
    </div>
  );
}
