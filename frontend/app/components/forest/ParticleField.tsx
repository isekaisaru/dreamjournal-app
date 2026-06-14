"use client";

import { useRef, useEffect } from "react";
import { useReducedMotion } from "framer-motion";
import type { TimePhase, Season } from "@/lib/forestAtmosphere";

type Weather = "firefly" | "shooting" | "rain" | "calm";

interface ParticleFieldProps {
  phase: TimePhase;
  season: Season;
  weather?: Weather;
  starOpacity?: number;
  /** Particle density multiplier. Default 1. */
  density?: number;
}

function makeGlow(size: number, inner: string, outer: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner); g.addColorStop(0.45, outer); g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g; x.beginPath(); x.arc(size / 2, size / 2, size / 2, 0, 7); x.fill();
  return c;
}

function rnd(a: number, b: number) { return a + Math.random() * (b - a); }

export default function ParticleField({ phase, season, weather = "firefly", starOpacity = 1, density = 1 }: ParticleFieldProps) {
  const reduceMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef  = useRef({ phase, season, weather, starOpacity, density, motion: !reduceMotion });

  useEffect(() => { propsRef.current = { phase, season, weather, starOpacity, density, motion: !reduceMotion }; });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    let W = 0, H = 0;

    const fireGlow = makeGlow(40, "rgba(253,230,138,1)", "rgba(251,191,36,0.55)");
    const moteGlow = makeGlow(28, "rgba(199,210,254,0.85)", "rgba(199,210,254,0.18)");

    type Star = { x: number; y: number; r: number; tw: number; sp: number };
    type FF   = { x: number; y: number; vx: number; vy: number; ph: number; sp: number; r: number };
    type Mote = { x: number; y: number; vx: number; vy: number; r: number; a: number };
    type Petal = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; sway: number; size: number };
    type Shooter = { x: number; y: number; vx: number; vy: number; life: number };
    type Rain  = { x: number; y: number; len: number; sp: number };
    let st: { stars: Star[]; ffs: FF[]; motes: Mote[]; petals: Petal[]; shooters: Shooter[]; rain: Rain[]; t: number } | null = null;

    const spawnPetal = (initial: boolean): Petal => ({
      x: Math.random() * W, y: initial ? Math.random() * H : -10,
      vx: rnd(-0.4, 0.2), vy: rnd(0.3, 0.85),
      rot: Math.random() * 6.28, vr: rnd(-0.04, 0.04), sway: Math.random() * 6.28, size: rnd(8, 14),
    });

    function seed() {
      const d = propsRef.current.density;
      st = {
        stars:    Array.from({ length: Math.round(46 * d) }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.78, r: rnd(0.4, 1.6), tw: Math.random() * 6.28, sp: rnd(0.5, 1.8) })),
        ffs:      Array.from({ length: Math.round(9 * d)  }, () => ({ x: Math.random() * W, y: rnd(H * 0.45, H * 0.95), vx: rnd(-0.25, 0.25), vy: rnd(-0.18, 0.18), ph: Math.random() * 6.28, sp: rnd(0.6, 1.4), r: rnd(1.2, 2.4) })),
        motes:    Array.from({ length: Math.round(16 * d)  }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: rnd(-0.12, 0.12), vy: rnd(-0.25, -0.05), r: rnd(0.6, 2.2), a: rnd(0.05, 0.28) })),
        petals:   Array.from({ length: Math.round(15 * d)  }, () => spawnPetal(true)),
        shooters: [], rain: [], t: 0,
      };
    }

    function resize() {
      if (!canvas) return;
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width  = Math.max(1, W * dpr);
      canvas.height = Math.max(1, H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (!propsRef.current.motion) frame(performance.now());
    }

    const GLYPH: Record<string, string> = { spring: "🌸", summer: "🍃", autumn: "🍁", winter: "❄️" };
    const FRAME_MS = 1000 / 30; // ~30 fps throttle
    let raf = 0, lastT = 0;

    function frame(now: number) {
      const P = propsRef.current;
      const moving = P.motion;
      if (moving && now - lastT < FRAME_MS) {
        raf = requestAnimationFrame(frame);
        return;
      }
      lastT = now;
      if (!st) {
        if (moving) raf = requestAnimationFrame(frame);
        return;
      }
      st.t++;
      ctx.clearRect(0, 0, W, H);

      // stars
      ctx.fillStyle = "#ffffff";
      for (const s of st.stars) {
        const tw = moving ? (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(st.t * 0.04 * s.sp + s.tw))) : 0.8;
        ctx.globalAlpha = Math.max(0, P.starOpacity * tw);
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
      }

      // motes
      for (const m of st.motes) {
        if (moving) {
          m.x += m.vx; m.y += m.vy;
          if (m.y < -5) { m.y = H + 5; m.x = Math.random() * W; }
          if (m.x < -5) m.x = W + 5; if (m.x > W + 5) m.x = -5;
        }
        ctx.globalAlpha = m.a;
        const sz = m.r * 6;
        ctx.drawImage(moteGlow, m.x - sz / 2, m.y - sz / 2, sz, sz);
      }

      // fireflies
      if (P.weather === "firefly" || P.weather === "calm") {
        for (const f of st.ffs) {
          if (moving) {
            f.ph += 0.06 * f.sp;
            f.x += f.vx + Math.sin(f.ph) * 0.3; f.y += f.vy + Math.cos(f.ph * 0.7) * 0.2;
            if (f.x < 0) f.x = W; if (f.x > W) f.x = 0;
            if (f.y < H * 0.4) f.vy = Math.abs(f.vy); if (f.y > H) f.vy = -Math.abs(f.vy);
          }
          const gl = moving ? (0.25 + 0.75 * (0.5 + 0.5 * Math.sin(f.ph))) : 0.7;
          ctx.globalAlpha = gl;
          const sz = f.r * 10;
          ctx.drawImage(fireGlow, f.x - sz / 2, f.y - sz / 2, sz, sz);
        }
      }

      // seasonal petals
      ctx.globalAlpha = 0.85;
      ctx.font = "13px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const glyph = GLYPH[P.season] ?? "🌸";
      for (const p of st.petals) {
        if (moving) {
          p.sway += 0.02; p.x += p.vx + Math.sin(p.sway) * 0.5; p.y += p.vy; p.rot += p.vr;
          if (p.y > H + 12) Object.assign(p, spawnPetal(false));
          if (p.x < -12) p.x = W + 12; if (p.x > W + 12) p.x = -12;
        }
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillText(glyph, 0, 0); ctx.restore();
      }

      // shooting stars
      if (P.weather === "shooting" && moving) {
        if (Math.random() < 0.02 && st.shooters.length < 3)
          st.shooters.push({ x: rnd(W * 0.1, W * 0.9), y: rnd(0, H * 0.3), vx: rnd(4, 7), vy: rnd(2, 3.5), life: 1 });
        ctx.lineWidth = 2;
        for (const sh of st.shooters) {
          sh.x += sh.vx; sh.y += sh.vy; sh.life -= 0.02;
          ctx.globalAlpha = Math.max(0, sh.life);
          ctx.strokeStyle = "rgba(255,255,255,0.9)";
          ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(sh.x - sh.vx * 10, sh.y - sh.vy * 10); ctx.stroke();
        }
        st.shooters = st.shooters.filter((s) => s.life > 0 && s.x < W + 50 && s.y < H + 50);
      }

      // rain
      if (P.weather === "rain" && moving) {
        while (st.rain.length < Math.round(56 * P.density))
          st.rain.push({ x: Math.random() * W, y: Math.random() * H, len: rnd(8, 16), sp: rnd(6, 11) });
        ctx.strokeStyle = "rgba(160,190,255,0.32)"; ctx.lineWidth = 1.1; ctx.globalAlpha = 1;
        for (const d of st.rain) {
          d.y += d.sp; d.x += 1.2;
          if (d.y > H) { d.y = -d.len; d.x = Math.random() * W; }
          ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 1.4, d.y - d.len); ctx.stroke();
        }
      } else if (st.rain.length) st.rain = [];

      ctx.globalAlpha = 1;
      if (moving) raf = requestAnimationFrame(frame);
    }

    resize();
    if (propsRef.current.motion) raf = requestAnimationFrame(frame);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      aria-hidden="true"
    />
  );
}
