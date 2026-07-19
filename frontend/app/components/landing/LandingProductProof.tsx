"use client";

import { motion, type Variants, useReducedMotion } from "framer-motion";
import { Mic, Brain, TrendingUp } from "lucide-react";

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

export default function LandingProductProof() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="px-4 py-16 sm:py-24">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        className="relative mx-auto max-w-2xl rounded-3xl border border-slate-200/80 bg-slate-100/80 p-6 backdrop-blur-sm dark:border-slate-700/30 dark:bg-slate-800/40 sm:p-10 lg:max-w-5xl"
      >
        <div className="space-y-8 lg:flex lg:items-stretch lg:gap-4 lg:space-y-0">
          {/* Step 1: 入力 */}
          <motion.div
            variants={reduceMotion ? undefined : fadeIn}
            custom={0}
            className="flex items-start gap-4 lg:flex-1 lg:flex-col lg:items-center lg:text-center"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-sky-500/15">
              <Mic className="text-sky-500 dark:text-sky-400" size={20} />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-sky-600 dark:text-sky-400">声またはテキストで記録</p>
              <div className="rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-700/40 dark:bg-slate-900/60">
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  「空を飛んでいた。すごく気持ちよくて、
                  <br className="hidden sm:block" />
                  雲の上に誰かが待っている気がした」
                </p>
              </div>
            </div>
          </motion.div>

          {/* つなぎ */}
          <motion.div variants={reduceMotion ? undefined : fadeIn} custom={1} className="flex justify-center lg:items-center">
            <div className="h-8 w-px bg-gradient-to-b from-sky-500/40 to-purple-500/40 lg:h-px lg:w-8 lg:bg-gradient-to-r" />
          </motion.div>

          {/* Step 2: AI分析結果 */}
          <motion.div
            variants={reduceMotion ? undefined : fadeIn}
            custom={2}
            className="flex items-start gap-4 lg:flex-1 lg:flex-col lg:items-center lg:text-center"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-purple-500/15">
              <Brain className="text-purple-500 dark:text-purple-400" size={20} />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-purple-600 dark:text-purple-400">モルペウスのAI分析</p>
              <div className="rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-700/40 dark:bg-slate-900/60">
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  「すごいゆめだね！そらをとぶゆめは、
                  <br className="hidden sm:block" />
                  きみが <span className="text-sky-500 dark:text-sky-300">あたらしいことにちょうせん</span> したい
                  <br className="hidden sm:block" />
                  きもちのあらわれだよ」
                </p>
              </div>
            </div>
          </motion.div>

          {/* つなぎ */}
          <motion.div variants={reduceMotion ? undefined : fadeIn} custom={3} className="flex justify-center lg:items-center">
            <div className="h-8 w-px bg-gradient-to-b from-purple-500/40 to-amber-500/40 lg:h-px lg:w-8 lg:bg-gradient-to-r" />
          </motion.div>

          {/* Step 3: 感情タグ */}
          <motion.div
            variants={reduceMotion ? undefined : fadeIn}
            custom={4}
            className="flex items-start gap-4 lg:flex-1 lg:flex-col lg:items-center lg:text-center"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
              <TrendingUp className="text-amber-500 dark:text-amber-400" size={20} />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-amber-600 dark:text-amber-400">感情タグ</p>
              <div className="flex flex-wrap gap-2 lg:justify-center">
                {["わくわく", "自由", "期待"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-sky-300/60 bg-sky-100 px-3 py-1 text-xs font-medium text-sky-600 dark:border-sky-500/20 dark:bg-sky-500/15 dark:text-sky-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
