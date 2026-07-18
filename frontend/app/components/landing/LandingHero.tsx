"use client";

import Link from "next/link";
import { Sparkles, Lock } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import MorpheusImage from "@/app/components/MorpheusImage";

export default function LandingHero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-sky-950 px-4 py-16 sm:py-24 lg:px-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-75"
        style={{
          backgroundImage:
            "radial-gradient(2px 2px at 16% 20%, #fde68a, transparent), radial-gradient(1.6px 1.6px at 80% 26%, #fff, transparent), radial-gradient(1.6px 1.6px at 60% 14%, #c7d2fe, transparent), radial-gradient(2px 2px at 30% 68%, #fff, transparent)",
        }}
      />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-10 text-center lg:flex-row lg:text-left">
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative order-1 mb-2 h-44 w-44 shrink-0 rounded-[2rem] bg-white/10 p-3 ring-1 ring-white/10 backdrop-blur-sm lg:order-2 lg:h-64 lg:w-64"
        >
          <MorpheusImage variant="landing" size={256} priority className="animate-morpheus-float" />
          <Sparkles className="absolute -right-3 -top-3 animate-pulse text-yellow-300/80" size={20} />
        </motion.div>

        <div className="order-2 flex-1 lg:order-1">
          <motion.h1
            initial={reduceMotion ? undefined : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mb-6 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            YumeTree
            <br />
            <span className="bg-gradient-to-r from-sky-300 via-blue-300 to-purple-300 bg-clip-text text-transparent">
              モルペウスと育てるAI夢ノート
            </span>
          </motion.h1>

          <motion.p
            initial={reduceMotion ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.6 }}
            className="mx-auto mb-4 max-w-lg text-base leading-relaxed text-slate-300 sm:text-lg lg:mx-0"
          >
            夢は、忘れるためのものじゃない。
            <br className="hidden sm:block" />
            声でもテキストでも、起きたままをそっと残す。
            <br className="hidden sm:block" />
            <span className="text-slate-100">AIが感情と意味を読み解き、</span>夢の世界を画像で形に。
            <br className="hidden sm:block" />
            ひとりでも、大切な人とも使えるプライベートな夢ノート。
          </motion.p>

          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.5 }}
            className="flex flex-col items-center gap-4 lg:items-start"
          >
            <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link
                href="/trial"
                className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-10 py-4 text-base font-bold text-white shadow-xl shadow-sky-500/20 transition-all duration-300 hover:-translate-y-1 hover:from-sky-400 hover:to-blue-500 hover:shadow-2xl hover:shadow-sky-500/30 sm:text-lg"
              >
                <Sparkles size={20} />
                今朝の夢を入れてみる
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/15"
              >
                30秒でわかる
              </a>
            </div>
            <p className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <Lock size={12} />
              完全 非公開のプライベートノート
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
