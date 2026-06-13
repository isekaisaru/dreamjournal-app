"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import type { DreamProfile } from "@/app/types";
import {
  getTimePhase,
  getSeason,
  getSkyGradient,
  getCelestial,
} from "@/lib/forestAtmosphere";
import MiniTree from "./MiniTree";
import SeasonalParticles from "./SeasonalParticles";

const STARS = Array.from({ length: 40 }, (_, i) => ({
  left: (i * 53) % 100,
  top: (i * 37) % 70,
  delay: (i % 7) * 0.4,
  size: (i % 3) + 1,
}));

const FIREFLIES = Array.from({ length: 8 }, (_, i) => ({
  left: (i * 13 + 8) % 85 + 7,
  top: 55 + (i * 7) % 28,
  delay: (i * 0.7) % 2.8,
  dx: ((i % 3) - 1) * 18,
  dy: -(8 + (i % 5) * 4),
}));

const GROUND_DECO = [
  { left: 4, emoji: "🍄" },
  { left: 16, emoji: "🌿" },
  { left: 29, emoji: "🌸" },
  { left: 57, emoji: "🌿" },
  { left: 70, emoji: "🍄" },
  { left: 82, emoji: "🌱" },
  { left: 91, emoji: "🌿" },
];

export default function ForestScene({ profiles }: { profiles: DreamProfile[] }) {
  const reduceMotion = useReducedMotion();

  // 読込時の時刻・季節を1回だけ確定（再レンダーで動かないよう useMemo）
  const now = useMemo(() => new Date(), []);
  const phase = getTimePhase(now);
  const season = getSeason(now);
  const sky = getSkyGradient(phase);
  const { moonXPct, moonYPct, starOpacity } = getCelestial(phase);

  return (
    <div
      className="relative min-h-[70vh] overflow-hidden rounded-3xl"
      style={{ background: sky }}
    >
      {/* 星空（時間帯で濃さが変わる: 夜=濃い / 昼=ほぼ見えない） */}
      {STARS.map((s, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            opacity: starOpacity,
          }}
          animate={
            reduceMotion
              ? undefined
              : { opacity: [0.2 * starOpacity, starOpacity, 0.2 * starOpacity] }
          }
          transition={{ duration: 3, repeat: Infinity, delay: s.delay }}
          aria-hidden="true"
        />
      ))}

      {/* 月（位置が時間帯で変わる） */}
      <div
        className="absolute h-16 w-16 -translate-x-1/2 rounded-full bg-[#fef3c7] shadow-[0_0_50px_20px_rgba(254,243,199,0.35)]"
        style={{ left: `${moonXPct}%`, top: `${moonYPct}%` }}
        aria-hidden="true"
      />

      {/* 季節パーティクル（🌸/🍃/🍁/❄️） */}
      <SeasonalParticles season={season} />

      {/* ほたる（reduced-motion 時は静止した光点として表示） */}
      {FIREFLIES.map((f, i) => (
        <motion.span
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-amber-200"
          style={{ left: `${f.left}%`, top: `${f.top}%`, opacity: 0.5 }}
          animate={
            reduceMotion
              ? undefined
              : { x: [0, f.dx, 0], y: [0, f.dy, 0], opacity: [0.15, 0.9, 0.15] }
          }
          transition={{ duration: 2.5 + f.delay, repeat: Infinity, ease: "easeInOut", delay: f.delay }}
          aria-hidden="true"
        />
      ))}

      {/* 地面 */}
      <div
        className="absolute bottom-0 h-28 w-full bg-gradient-to-t from-[#2a2150] to-transparent"
        aria-hidden="true"
      />

      {/* 霧 */}
      <div
        className="pointer-events-none absolute bottom-0 h-20 w-full"
        style={{ background: "linear-gradient(to top, rgba(70,45,150,0.40), rgba(50,30,110,0.12) 55%, transparent)" }}
        aria-hidden="true"
      />

      {/* 地面の草花 */}
      <div className="absolute bottom-5 left-0 right-0 z-[5]" aria-hidden="true">
        {GROUND_DECO.map((d, i) => (
          <span key={i} className="absolute text-xs" style={{ left: `${d.left}%`, bottom: 0 }}>
            {d.emoji}
          </span>
        ))}
      </div>

      {/* 木を並べる / プロフィール0件の空状態 */}
      <div className="relative z-10 flex flex-wrap items-end justify-center gap-6 px-6 pb-16 pt-24">
        {profiles.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <motion.span
              className="text-5xl"
              animate={reduceMotion ? undefined : { y: [-4, 4, -4], scale: [1, 1.05, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden="true"
            >
              🌱
            </motion.span>
            <p className="text-base font-bold text-white/90">まだ きが ないよ</p>
            <p className="text-sm leading-relaxed text-white/60">
              プロフィールを つくると、<br />
              ゆめの きが ここに そだつよ。
            </p>
            <Link
              href="/profiles"
              className="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20"
            >
              プロフィールを つくる
            </Link>
          </div>
        ) : (
          profiles.map((p) => <MiniTree key={p.id} profile={p} />)
        )}
      </div>
    </div>
  );
}
