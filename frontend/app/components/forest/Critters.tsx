"use client";

import { useRef, useEffect } from "react";
import { useReducedMotion } from "framer-motion";

interface CritterDef { emoji: string; kind: "hop" | "walk" | "fly"; yPct: number; speed: number; }

const CRITTERS: CritterDef[] = [
  { emoji: "🐰", kind: "hop",  yPct: 6,  speed: 0.7 },
  { emoji: "🦊", kind: "walk", yPct: 4,  speed: 0.5 },
  { emoji: "🦔", kind: "walk", yPct: 3,  speed: 0.35 },
  { emoji: "🐱", kind: "walk", yPct: 4,  speed: 0.45 },
  { emoji: "🦉", kind: "fly",  yPct: 38, speed: 0.4 },
  { emoji: "🦋", kind: "fly",  yPct: 50, speed: 0.6 },
];

interface CritterProps { data: CritterDef; fieldW: number; motion: boolean; }

function Critter({ data, fieldW, motion }: CritterProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const st = useRef({ x: Math.random() * fieldW, dir: Math.random() > 0.5 ? 1 : -1, ph: Math.random() * Math.PI * 2, flipTimer: 0 });

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    if (!motion) {
      el.style.left = st.current.x + "px";
      el.style.transform = `translateX(-50%) scaleX(${st.current.dir})`;
      return;
    }
    let raf = 0;
    let disposed = false;
    const tick = () => {
      if (disposed) return;
      const el = elRef.current;
      if (!el) return;
      const s = st.current;
      s.ph += 0.016;
      s.x += s.dir * data.speed;
      if (s.x < -30) { s.dir = 1;  s.x = -30; }
      if (s.x > fieldW + 30) { s.dir = -1; s.x = fieldW + 30; }
      if (data.kind !== "fly") {
        s.flipTimer++;
        if (s.flipTimer > 180 && Math.random() < 0.01) { s.dir = -s.dir; s.flipTimer = 0; }
      }
      let bob = 0;
      if (data.kind === "hop")  bob = Math.abs(Math.sin(s.ph * 3)) * -14;
      else if (data.kind === "walk") bob = Math.sin(s.ph * 6) * 2;
      else bob = Math.sin(s.ph * 1.5) * 10;
      el.style.left = s.x + "px";
      el.style.transform = `translateX(-50%) translateY(${bob.toFixed(2)}px) scaleX(${s.dir})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
    };
  }, [motion, fieldW, data]);

  return (
    <div
      ref={elRef}
      style={{
        position: "absolute",
        left: st.current.x,
        bottom: `${data.yPct}%`,
        fontSize: data.kind === "fly" ? 22 : 26,
        zIndex: 12,
        userSelect: "none",
        filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.4))",
      }}
      aria-hidden="true"
    >
      {data.emoji}
    </div>
  );
}

interface CrittersProps {
  fieldW: number;
  /** Max number of critters to show (0–6). Defaults to 4. */
  count?: number;
}

export default function Critters({ fieldW, count = 4 }: CrittersProps) {
  const reduceMotion = useReducedMotion();
  const motion = !reduceMotion;
  const list = CRITTERS.slice(0, Math.max(0, Math.min(count, CRITTERS.length)));

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 12 }} aria-hidden="true">
      {list.map((c, i) => (
        <Critter key={i} data={c} fieldW={fieldW} motion={motion} />
      ))}
    </div>
  );
}
