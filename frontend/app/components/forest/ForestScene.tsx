"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DreamProfile } from "@/app/types";
import {
  getTimePhase,
  getSeason,
  getSkyGradient,
  getCelestial,
  HAZE,
} from "@/lib/forestAtmosphere";
import { getGrowthLevel, getCanopyScale } from "@/lib/forest";
import MiniTree from "./MiniTree";
import ForestTodayCard from "./ForestTodayCard";
import ParticleField from "./ParticleField";
import Critters from "./Critters";
import WalkingMorpheus from "./WalkingMorpheus";
import TreePreviewSheet from "./TreePreviewSheet";

export default function ForestScene({ profiles }: { profiles: DreamProfile[] }) {
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(960);
  const [H, setH] = useState(560);
  const fieldW = Math.max(W, 1180); // 森の世界はビューポートより広く、パンで探索できる

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setW(el.clientWidth);
      setH(el.clientHeight);
    });
    ro.observe(el);
    setW(el.clientWidth);
    setH(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  // 読込時の時刻・季節を1回だけ確定
  const now = useMemo(() => new Date(), []);
  const phase = getTimePhase(now);
  const season = getSeason(now);
  const sky = getSkyGradient(phase);
  const cel = getCelestial(phase);
  const haze = HAZE[phase];

  // パン & ズーム
  const [view, setView] = useState({ x: 0, y: 0, z: 1 });
  const dragRef = useRef<{ sx: number; sy: number; vx: number; vy: number } | null>(null);
  const movedRef = useRef(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; z: number } | null>(null);
  const [hinted, setHinted] = useState(true);

  const clamp = useCallback(
    (v: { x: number; y: number; z: number }) => {
      const z = Math.max(0.7, Math.min(2.2, v.z));
      return {
        z,
        x: Math.max(Math.min(v.x, 40), Math.min(-(fieldW * z - W) - 40, 40)),
        y: Math.max(Math.min(v.y, 60), Math.min(-(H * z - H) - 40, 60)),
      };
    },
    [fieldW, W, H]
  );

  // ポインタ捕捉は「ドラッグと判定してから」遅延して行う。
  // pointerdown で即捕捉すると子の木ボタンの click が発火せず、タップで
  // プレビューシートが開かなくなるため（重要）。
  const capturedRef = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    movedRef.current = false;
    capturedRef.current = false;
    setHinted(false);
    if (pointers.current.size === 1) {
      dragRef.current = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
    } else if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), z: view.z };
      dragRef.current = null;
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2 && pinch.current) {
      if (!capturedRef.current) {
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        capturedRef.current = true;
      }
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      setView((v) => clamp({ ...v, z: pinch.current!.z * (dist / pinch.current!.dist) }));
    } else if (dragRef.current) {
      const dx = e.clientX - dragRef.current.sx;
      const dy = e.clientY - dragRef.current.sy;
      if (Math.abs(dx) + Math.abs(dy) > 6) {
        movedRef.current = true;
        // ドラッグと確定してから捕捉する（タップの click は妨げない）
        if (!capturedRef.current) {
          try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
          capturedRef.current = true;
        }
      }
      setView((v) => clamp({ ...v, x: dragRef.current!.vx + dx, y: dragRef.current!.vy + dy }));
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) {
      dragRef.current = null;
      capturedRef.current = false;
    }
  };
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setView((v) => clamp({ ...v, z: v.z * (e.deltaY > 0 ? 0.92 : 1.08) }));
    setHinted(false);
  };

  // 木タップ → プレビューシート（ドラッグ中は選択しない）
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = profiles.find((p) => p.id === selectedId) ?? null;
  const selectTree = (p: DreamProfile) => {
    if (!movedRef.current) setSelectedId(p.id);
  };

  // 木の配置（横に広げ、奇数列は少し奥に）
  const planted = useMemo(() => {
    const n = profiles.length;
    const margin = 120;
    return profiles.map((p, i) => {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const x = margin + t * (fieldW - margin * 2);
      const row = i % 2;
      return {
        p,
        x,
        depth: row === 0 ? 1 : 0.82,
        groundY: row === 0 ? 0.1 : 0.2,
        lvl: getGrowthLevel(p.dreams_count ?? 0).level,
      };
    });
  }, [profiles, fieldW]);

  const totalDreams = profiles.reduce((s, p) => s + (p.dreams_count ?? 0), 0);
  const topProfile = profiles.reduce<DreamProfile | null>((top, p) => {
    if ((p.dreams_count ?? 0) === 0) return top;
    if (!top || (p.dreams_count ?? 0) > (top.dreams_count ?? 0)) return p;
    return top;
  }, null);
  const isEmpty = profiles.length === 0;

  return (
    <div
      ref={wrapRef}
      className="relative min-h-[70vh] touch-none overflow-hidden rounded-3xl"
      style={{ background: sky }}
    >
      {/* === 固定アンビエント（パンしても動かない背景） === */}
      {/* 星・ほたる・季節パーティクルを1枚のCanvasに集約（30fps・reduced-motion対応） */}
      <ParticleField
        phase={phase}
        season={season}
        weather="firefly"
        starOpacity={cel.starOpacity}
        density={1}
      />

      {/* 月（位置・色が時間帯で変わる） */}
      <div
        className="pointer-events-none absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: `${cel.moonXPct}%`,
          top: `${cel.moonYPct}%`,
          background: cel.glow,
          boxShadow: `0 0 50px 20px ${cel.glow}55`,
        }}
        aria-hidden="true"
      />

      {/* きょうの もり カード（右上・固定） */}
      {!isEmpty && (
        <div className="absolute right-3 top-3 z-20">
          <ForestTodayCard totalDreams={totalDreams} topProfile={topProfile} />
        </div>
      )}

      {/* === パン/ズームできる森の世界 === */}
      {!isEmpty && (
        <div
          className="absolute inset-0"
          style={{ cursor: dragRef.current ? "grabbing" : "grab" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        >
          <div
            className="absolute left-0 top-0 h-full"
            style={{
              width: fieldW,
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`,
              transformOrigin: "0 0",
            }}
          >
            {/* なだらかな丘 */}
            <svg
              viewBox={`0 0 ${fieldW} ${H}`}
              width={fieldW}
              height={H}
              preserveAspectRatio="none"
              className="absolute inset-0"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="forest-hill-far" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#2a2150" stopOpacity="0.6" />
                  <stop offset="1" stopColor="#1b1438" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="forest-hill-near" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#241c46" />
                  <stop offset="1" stopColor="#120d28" />
                </linearGradient>
              </defs>
              <path
                d={`M0 ${H * 0.74} Q ${fieldW * 0.25} ${H * 0.66} ${fieldW * 0.5} ${H * 0.73} T ${fieldW} ${H * 0.72} L ${fieldW} ${H} L0 ${H} Z`}
                fill="url(#forest-hill-far)"
              />
              <path
                d={`M0 ${H * 0.86} Q ${fieldW * 0.3} ${H * 0.78} ${fieldW * 0.62} ${H * 0.86} T ${fieldW} ${H * 0.84} L ${fieldW} ${H} L0 ${H} Z`}
                fill="url(#forest-hill-near)"
              />
            </svg>

            {/* 地面の霞 */}
            <div
              className="pointer-events-none absolute bottom-0 left-0 h-28"
              style={{ background: `linear-gradient(to top, ${haze}, transparent)`, width: fieldW }}
              aria-hidden="true"
            />

            {/* 木 */}
            {planted.map(({ p, x, depth, groundY, lvl }) => (
              <div
                key={p.id}
                className="absolute"
                style={{
                  left: x,
                  bottom: `${groundY * 100}%`,
                  transform: "translateX(-50%)",
                  zIndex: depth > 0.9 ? 8 : 5,
                  opacity: depth > 0.9 ? 1 : 0.94,
                }}
              >
                <MiniTree
                  profile={p}
                  isSelected={selectedId === p.id}
                  onSelect={() => selectTree(p)}
                  height={Math.round((120 + lvl * 22) * getCanopyScale(lvl) * 0.9 + 80)}
                />
              </div>
            ))}

            {/* 小動物・歩くモルペウス（reduced-motion時は非表示） */}
            {!reduceMotion && (
              <Critters fieldW={fieldW} count={Math.min(4, 2 + profiles.length)} />
            )}
            {!reduceMotion && <WalkingMorpheus fieldW={fieldW} baseY={H * 0.06} />}
          </div>
        </div>
      )}

      {/* ズームコントロール（左上・木/今日カード/モルペウスと重ならない位置） */}
      {!isEmpty && (
        <div className="absolute left-3 top-3 z-30 flex flex-col gap-2">
          {(
            [
              ["＋", "ズームイン", () => setView((v) => clamp({ ...v, z: v.z * 1.2 }))],
              ["－", "ズームアウト", () => setView((v) => clamp({ ...v, z: v.z * 0.83 }))],
              ["⟳", "もとに もどす", () => setView({ x: 0, y: 0, z: 1 })],
            ] as const
          ).map(([t, lab, fn], i) => (
            <button
              key={i}
              onClick={fn}
              aria-label={lab}
              className="h-10 w-10 rounded-xl border border-white/25 bg-[rgba(12,12,32,0.65)] text-[18px] font-bold text-white/90 backdrop-blur-lg hover:bg-[rgba(12,12,32,0.85)]"
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* ドラッグヒント */}
      {hinted && !selected && !isEmpty && (
        <div className="pointer-events-none absolute bottom-[74px] left-1/2 z-[35] -translate-x-1/2 rounded-full border border-white/20 bg-[rgba(12,12,32,0.65)] px-4 py-2 text-[12.5px] font-semibold text-white/85 backdrop-blur-lg">
          👆 ドラッグで うごかせる・ピンチで ズーム
        </div>
      )}

      {/* 空状態（プロフィール0件） */}
      {isEmpty && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <motion.span
            className="text-5xl"
            animate={reduceMotion ? undefined : { y: [-4, 4, -4], scale: [1, 1.05, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          >
            🌱
          </motion.span>
          <p className="text-base font-bold text-white/90">まだ きが ないよ</p>
          <p className="max-w-xs text-sm leading-relaxed text-white/60">
            プロフィールを つくると、ゆめの きが ここに そだつよ。
          </p>
          <Link
            href="/profiles"
            className="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20"
          >
            プロフィールを つくる
          </Link>
        </div>
      )}

      {/* 木タップ時のプレビューシート */}
      <TreePreviewSheet
        profile={selected}
        onOpen={(p) => router.push(`/forest/${p.id}`)}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
