"use client";

import { useRef, useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import MorpheusImage from "@/app/components/MorpheusImage";

const LINES = [
  "きょうは どんな ゆめ みた？",
  "きを タップしてみてね",
  "もりが そだってきたね！",
  "ゆめを かくと きが おおきくなるよ",
];

interface WalkingMorpheusProps {
  /** World width in px (matching pannable fieldW). */
  fieldW: number;
  /** Bottom offset in px from the scene's bottom. Default 0. */
  baseY?: number;
}

/**
 * Morpheus walks along the forest floor using direct DOM ref writes so there
 * are no per-frame React re-renders. The cute chibi photo (MorpheusImage) is
 * shown in a circular glowing medallion — the same treatment used in ForestGuide.
 */
export default function WalkingMorpheus({ fieldW, baseY = 0 }: WalkingMorpheusProps) {
  const reduceMotion = useReducedMotion();
  const motion = !reduceMotion;
  const outerRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const st = useRef({ x: fieldW * 0.5, dir: 1, target: fieldW * 0.7 });
  const [say, setSay] = useState<string | null>(null);

  // pick new wander targets
  useEffect(() => {
    if (!motion) return;
    const pick = () => { st.current.target = 80 + Math.random() * (fieldW - 160); };
    pick();
    const iv = setInterval(pick, 4200 + Math.random() * 2600);
    return () => clearInterval(iv);
  }, [fieldW, motion]);

  // speech bubbles
  useEffect(() => {
    if (!motion) return;
    let alive = true;
    const loop = () => {
      const wait = 5200 + Math.random() * 4200;
      setTimeout(() => {
        if (!alive) return;
        setSay(LINES[Math.floor(Math.random() * LINES.length)]);
        setTimeout(() => alive && setSay(null), 3400);
        loop();
      }, wait);
    };
    loop();
    return () => { alive = false; };
  }, [motion]);

  // walk animation (DOM writes, no React state per frame)
  useEffect(() => {
    if (!outerRef.current) return;
    if (!motion) {
      outerRef.current.style.left = st.current.x + "px";
      return;
    }
    let raf = 0, t0 = performance.now();
    let disposed = false;
    const step = (now: number) => {
      if (disposed) return;
      const outer = outerRef.current;
      if (!outer) return;
      const photo = photoRef.current;
      const dt = Math.min(48, now - t0); t0 = now;
      const s = st.current;
      const diff = s.target - s.x;
      if (Math.abs(diff) >= 2) {
        s.dir = Math.sign(diff) || 1;
        s.x += Math.sign(diff) * Math.min(Math.abs(diff), 0.045 * dt);
      }
      outer.style.left = s.x + "px";
      if (photo) photo.style.transform = `translateY(${(Math.sin(now / 150) * 3).toFixed(2)}px) scaleX(${s.dir})`;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
    };
  }, [motion]);

  return (
    <div
      ref={outerRef}
      style={{ position: "absolute", left: st.current.x, bottom: baseY, transform: "translateX(-50%)", zIndex: 30, pointerEvents: "none" }}
    >
      {/* speech bubble */}
      {say && (
        <div
          style={{
            position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
            marginBottom: 8, whiteSpace: "nowrap",
            background: "rgba(255,255,255,0.95)", color: "#312e81",
            fontSize: 13, fontWeight: 700, padding: "6px 12px", borderRadius: 14,
            boxShadow: "0 8px 24px rgba(10,8,30,0.4)",
            animation: "forest-pop 0.3s ease both",
          }}
        >
          {say}
          <span
            style={{
              position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
              width: 0, height: 0,
              borderLeft: "6px solid transparent", borderRight: "6px solid transparent",
              borderTop: "7px solid rgba(255,255,255,0.95)",
            }}
          />
        </div>
      )}

      {/* circular medallion */}
      <div ref={photoRef} style={{ transformOrigin: "center" }}>
        <div
          style={{
            width: 72, height: 72, borderRadius: "50%", overflow: "hidden",
            border: "2px solid rgba(165,180,252,0.7)",
            background: "radial-gradient(circle at 50% 35%, #efeaff, #d9d3f7)",
            boxShadow: "0 0 22px 4px rgba(165,180,252,0.55), 0 6px 14px rgba(8,6,28,0.45)",
          }}
        >
          <MorpheusImage variant="home" size={72} priority={false} />
        </div>
      </div>

      {/* ground shadow */}
      <div
        style={{
          position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)",
          width: 48, height: 9, borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(0,0,0,0.35), transparent 70%)",
        }}
        aria-hidden="true"
      />
    </div>
  );
}
