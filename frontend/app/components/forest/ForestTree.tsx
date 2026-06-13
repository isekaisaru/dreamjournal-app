"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import type { Dream, DreamProfile } from "@/app/types";
import { getGrowthLevel, getCanopyScale, fruitPosition, fruitColor, RECENT_FRUIT_COUNT } from "@/lib/forest";
import { useReducedMotion } from "framer-motion";

// ---- helper: deterministic uid (safe for SSR — only used inside useMemo) ---
let _uid = 0;
function uid() { return `ft${++_uid}`; }

// ---- foliage clusters per growth level ---------------------------------
interface Cluster { cx: number; cy: number; r: number; layer: "back" | "main" | "front"; }

function canopyClusters(level: number): Cluster[] {
  const full: Cluster[] = [
    { cx: 100, cy: 96,  r: 60, layer: "main" },
    { cx: 60,  cy: 122, r: 40, layer: "back" },
    { cx: 142, cy: 120, r: 42, layer: "back" },
    { cx: 78,  cy: 78,  r: 36, layer: "front" },
    { cx: 124, cy: 80,  r: 38, layer: "front" },
    { cx: 100, cy: 120, r: 48, layer: "main" },
  ];
  if (level >= 4) return full;
  if (level === 3) return [full[0], full[1], full[2], full[5]];
  if (level === 2) return [
    { cx: 100, cy: 120, r: 48, layer: "main" },
    { cx: 74,  cy: 138, r: 32, layer: "back" },
    { cx: 126, cy: 138, r: 32, layer: "back" },
  ];
  if (level === 1) return [
    { cx: 100, cy: 150, r: 36, layer: "main" },
    { cx: 80,  cy: 162, r: 24, layer: "back" },
    { cx: 120, cy: 162, r: 24, layer: "back" },
  ];
  return []; // level 0: sprout below
}

function trunkPath(level: number): string {
  const topY = level >= 4 ? 120 : level === 3 ? 132 : level === 2 ? 152 : 172;
  const w = level >= 3 ? 11 : 8;
  return `M${100 - w},250 C${100 - w + 2},210 ${100 - w + 3},${topY + 30} ${100 - w + 4},${topY}
          C${100 - w + 4},${topY - 8} ${100 + w - 4},${topY - 8} ${100 + w - 4},${topY}
          C${100 + w - 3},${topY + 30} ${100 + w - 2},210 ${100 + w},250 Z`;
}

// ---- types ---------------------------------------------------------------
export type TreeVariant = "mini" | "detail";

interface LeafParticle {
  id: number;
  x: number; y: number;
  dx: number; dy: number;
  rot: number;
  kind: "leaf" | "spark";
  color: string;
}

interface ForestTreeProps {
  profile: DreamProfile;
  dreams?: Dream[];
  /** Override computed growth level (optional) */
  level?: number;
  height?: number;
  variant?: TreeVariant;
  /** true = JS damped-spring sway (detail). false = CSS keyframe sway (mini, cheaper). */
  usePhysics?: boolean;
  showFruits?: boolean;
  onTapTree?: () => void;
  onTapFruit?: (dream: Dream) => void;
  /** Increment to trigger a grow-pulse animation */
  growPulse?: number;
}

export default function ForestTree({
  profile,
  dreams = [],
  level,
  height = 320,
  variant = "detail",
  usePhysics,
  showFruits = true,
  onTapTree,
  onTapFruit,
  growPulse = 0,
}: ForestTreeProps) {
  const reduceMotion = useReducedMotion();
  const motion = !reduceMotion;
  const physics = usePhysics ?? variant === "detail";
  const lvl = level ?? getGrowthLevel(dreams.length).level;
  const ids = useMemo(() => ({ fo: uid(), tr: uid(), gl: uid() }), []);
  const swayDelay = useMemo(() => (Math.random() * 4).toFixed(2), []);
  const color = profile.color;

  const gRef  = useRef<SVGGElement>(null);
  const divRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const springRef = useRef({ x: 0, v: 0, wind: Math.random() * Math.PI * 2 });
  const [leaves, setLeaves] = useState<LeafParticle[]>([]);

  // sway: CSS keyframe for mini, damped-spring rAF for detail
  useEffect(() => {
    const g = gRef.current;
    const div = divRef.current;
    if (!g || !div) return;
    if (!physics) {
      div.style.transformOrigin = "50% 90%";
      div.style.animation = motion
        ? `forest-sway ${(5 + Number(swayDelay) * 0.4).toFixed(1)}s ease-in-out ${swayDelay}s infinite`
        : "none";
      g.removeAttribute("transform");
      return;
    }
    let t = 0;
    const tick = () => {
      const s = springRef.current;
      s.v += -0.012 * s.x - 0.12 * s.v;
      s.x += s.v;
      t += 0.016;
      const amp = motion ? 2.2 : 0;
      const angle = s.x + Math.sin(t * 0.7 + s.wind) * amp + Math.sin(t * 1.7) * amp * 0.3;
      if (gRef.current) gRef.current.setAttribute("transform", `rotate(${angle.toFixed(3)} 100 250)`);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [motion, physics, swayDelay]);

  // grow pulse (spring impulse)
  useEffect(() => {
    if (growPulse > 0 && physics) springRef.current.v += 2.4;
  }, [growPulse, physics]);

  const burst = useCallback(() => {
    if (physics) springRef.current.v += (Math.random() > 0.5 ? 1 : -1) * 1.6;
    const n = variant === "mini" ? 5 : 10;
    const batch: LeafParticle[] = Array.from({ length: n }, (_, i) => ({
      id: Date.now() + i + Math.random(),
      x: 50 + (Math.random() - 0.5) * 60,
      y: 20 + Math.random() * 40,
      dx: (Math.random() - 0.5) * 120,
      dy: 60 + Math.random() * 90,
      rot: (Math.random() - 0.5) * 540,
      kind: Math.random() > 0.5 ? "leaf" : "spark",
      color,
    }));
    setLeaves((cur) => [...cur, ...batch]);
    setTimeout(() => setLeaves((cur) => cur.filter((l) => !batch.find((b) => b.id === l.id))), 1500);
  }, [variant, color, physics]);

  const fruits = useMemo(() => {
    if (!showFruits) return [];
    const recent = dreams.slice(0, variant === "mini" ? 3 : RECENT_FRUIT_COUNT);
    return recent.map((d, i) => ({
      dream: d,
      pos: fruitPosition(d.id, i),
      col: fruitColor(d, color),
    }));
  }, [dreams, showFruits, variant, color]);

  const clusters = canopyClusters(lvl);
  const aspect = 200 / 260;
  const width = height * aspect;
  const fruitXY = (pos: { xPct: number; yPct: number }) => ({
    x: 30 + (pos.xPct / 100) * 140,
    y: 46 + (pos.yPct / 100) * 120,
  });

  return (
    <div ref={divRef} style={{ position: "relative", width, height }}>
      <svg
        viewBox="0 0 200 260"
        width={width}
        height={height}
        style={{ overflow: "visible", display: "block", cursor: onTapTree ? "pointer" : "default" }}
        onClick={() => { burst(); onTapTree?.(); }}
        role={onTapTree ? "button" : undefined}
        aria-label={onTapTree ? `${profile.name}の き をタップ` : undefined}
      >
        <defs>
          <radialGradient id={ids.fo} cx="42%" cy="35%" r="72%">
            <stop offset="0%"   stopColor={color} stopOpacity="0.98" />
            <stop offset="55%"  stopColor={color} stopOpacity="0.8" />
            <stop offset="100%" stopColor={color} stopOpacity="0.28" />
          </radialGradient>
          <linearGradient id={ids.tr} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#5b3b22" />
            <stop offset="45%"  stopColor="#7a5230" />
            <stop offset="100%" stopColor="#4a2f1c" />
          </linearGradient>
          <radialGradient id={ids.gl} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={color} stopOpacity="0.5" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* glow halo */}
        {lvl > 0 && (
          <ellipse
            cx="100" cy="105"
            rx={70 * getCanopyScale(lvl)}
            ry={64 * getCanopyScale(lvl)}
            fill={`url(#${ids.gl})`}
          />
        )}

        <g ref={gRef}>
          {lvl === 0 ? (
            /* sprout */
            <g>
              <path d="M100,250 C99,230 99,215 100,205" stroke="#6b8f3a" strokeWidth="4" fill="none" strokeLinecap="round" />
              <path d="M100,212 C86,206 80,212 82,224 C94,224 100,220 100,212Z" fill={color} opacity="0.9" />
              <path d="M100,206 C114,200 122,206 120,218 C108,218 100,214 100,206Z" fill={color} opacity="0.8" />
            </g>
          ) : (
            <g>
              <path d={trunkPath(lvl)} fill={`url(#${ids.tr})`} />
              {lvl >= 3 && (
                <>
                  <path d="M100,170 C84,162 74,150 70,138" stroke="#5b3b22" strokeWidth="5" fill="none" strokeLinecap="round" />
                  <path d="M100,178 C116,170 126,158 132,146" stroke="#5b3b22" strokeWidth="5" fill="none" strokeLinecap="round" />
                </>
              )}
              {clusters.filter((c) => c.layer === "back").map((c, i) => (
                <circle key={`b${i}`} cx={c.cx} cy={c.cy} r={c.r} fill={color} opacity="0.42" />
              ))}
              {clusters.filter((c) => c.layer === "main").map((c, i) => (
                <circle key={`m${i}`} cx={c.cx} cy={c.cy} r={c.r} fill={`url(#${ids.fo})`} />
              ))}
              {clusters.filter((c) => c.layer === "front").map((c, i) => (
                <circle key={`f${i}`} cx={c.cx} cy={c.cy} r={c.r} fill="#ffffff" opacity="0.14" />
              ))}
            </g>
          )}
        </g>
      </svg>

      {/* fruits */}
      {fruits.map(({ dream: d, pos, col }) => {
        const { x, y } = fruitXY(pos);
        const px = (x / 200) * width;
        const py = (y / 260) * height;
        const sz = variant === "mini" ? 9 : 16;
        return (
          <button
            key={d.id}
            type="button"
            onClick={(e) => { e.stopPropagation(); onTapFruit?.(d); }}
            title={d.title}
            aria-label={`ゆめ「${d.title}」をひらく`}
            style={{
              position: "absolute", left: px, top: py, transform: "translate(-50%,-50%)",
              width: sz, height: sz, borderRadius: "50%", border: "none", padding: 0, cursor: "pointer",
              background: `radial-gradient(circle at 35% 30%, #fff, ${col} 60%, ${col})`,
              boxShadow: `0 0 10px 2px ${col}aa, 0 0 4px ${col}`,
              animation: motion ? "forest-fruit-bob 3s ease-in-out infinite" : "none",
              animationDelay: `${(pos.wobble * 2).toFixed(2)}s`,
              zIndex: 6,
            }}
          />
        );
      })}

      {/* tap burst particles */}
      {leaves.map((l) => (
        <span
          key={l.id}
          aria-hidden="true"
          style={{
            position: "absolute", left: `${l.x}%`, top: `${l.y}%`,
            "--dx": `${l.dx}px`, "--dy": `${l.dy}px`, "--rot": `${l.rot}deg`,
            width: l.kind === "leaf" ? 12 : 7, height: l.kind === "leaf" ? 12 : 7,
            borderRadius: l.kind === "leaf" ? "0 100% 0 100%" : "50%",
            background: l.kind === "leaf" ? l.color : "#fde68a",
            boxShadow: l.kind === "spark" ? "0 0 8px #fde68a" : "none",
            pointerEvents: "none", zIndex: 8,
            animation: "forest-leaf-fall 1.4s ease-out forwards",
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
