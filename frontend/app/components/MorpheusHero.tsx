"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import MorpheusSVG, { type MorpheusExpression } from "./MorpheusSVG";

type MorpheusHeroProps = {
  title: string;
  message: string;
  expression?: MorpheusExpression;
  size?: number;
  variant?: "home" | "compose" | "detail" | "voice";
  className?: string;
  action?: React.ReactNode;
};

const variantStyles = {
  home: "from-indigo-950 via-slate-900 to-sky-950 text-white border-white/15",
  compose: "from-violet-100 via-white to-sky-100 text-slate-900 border-violet-200/80 dark:from-slate-950 dark:via-indigo-950 dark:to-sky-950 dark:text-white dark:border-white/15",
  detail: "from-sky-100 via-white to-violet-100 text-slate-900 border-sky-200/80 dark:from-slate-950 dark:via-sky-950 dark:to-indigo-950 dark:text-white dark:border-white/15",
  voice: "from-slate-950 via-indigo-950 to-sky-950 text-white border-white/15",
} as const;

/**
 * 画面の主役として使う大きめのモルペウスカード。
 * 小さいフローティングアイコンではなく、モック画面のように
 * 「モルペウスが案内している」ことが一目で伝わる配置にする。
 */
export default function MorpheusHero({
  title,
  message,
  expression = "cheerful",
  size = 150,
  variant = "home",
  className = "",
  action,
}: MorpheusHeroProps) {
  return (
    <section
      className={`relative overflow-hidden rounded-[2rem] border bg-gradient-to-br p-5 shadow-xl ${variantStyles[variant]} ${className}`}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-14 left-8 h-36 w-36 rounded-full bg-violet-300/25 blur-3xl" />
      <div className="pointer-events-none absolute right-8 top-8 text-2xl text-amber-200/80 motion-safe:animate-pulse">
        ✦
      </div>
      <div className="pointer-events-none absolute left-6 bottom-6 text-lg text-sky-200/70 motion-safe:animate-pulse">
        ⋆
      </div>

      <div className="relative grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="min-w-0">
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/16 px-3 py-1 text-xs font-bold tracking-[0.16em] text-sky-100 ring-1 ring-white/20 backdrop-blur dark:text-sky-100">
            <Sparkles className="h-3.5 w-3.5" />
            MORPHEUS GUIDE
          </p>
          <h2 className="text-2xl font-black leading-tight sm:text-3xl">
            {title}
          </h2>
          <div className="relative mt-4 max-w-xl rounded-[1.5rem] bg-white/88 px-4 py-3 text-sm font-semibold leading-relaxed text-slate-800 shadow-lg ring-1 ring-white/60 dark:bg-slate-900/82 dark:text-slate-100 dark:ring-white/15">
            {message}
            <div className="absolute -right-2 top-8 hidden h-0 w-0 border-y-[9px] border-y-transparent border-l-[10px] border-l-white/88 dark:border-l-slate-900/82 sm:block" />
          </div>
          {action ? <div className="mt-4">{action}</div> : null}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.86, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 210, damping: 18 }}
          className="mx-auto grid place-items-center sm:mx-0"
        >
          <div className="relative">
            <div className="absolute inset-x-3 bottom-1 h-8 rounded-full bg-sky-300/35 blur-xl" />
            <MorpheusSVG
              expression={expression}
              size={size}
              className="relative drop-shadow-[0_18px_40px_rgba(56,189,248,0.38)]"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
