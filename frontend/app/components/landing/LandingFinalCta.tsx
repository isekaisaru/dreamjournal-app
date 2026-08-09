"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import MorpheusImage from "@/app/components/MorpheusImage";

export default function LandingFinalCta() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="px-4 py-16 text-center sm:py-24">
      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <MorpheusImage variant="reward" size={120} className="mx-auto mb-6" />
        <p className="mb-2 text-xl font-bold text-slate-700 dark:text-slate-200 sm:text-2xl">
          今夜の夢が、明日の気づきになる。
        </p>
        <p className="mb-8 text-sm text-slate-500 dark:text-slate-500">
          ひとりでも、恋人や家族・友達とも。あなたのペースで続けられます。
        </p>
        <Link
          href="/trial"
          className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-10 py-4 text-base font-bold text-white shadow-xl shadow-sky-500/20 transition-all duration-300 hover:-translate-y-1 hover:from-sky-400 hover:to-blue-500 hover:shadow-2xl hover:shadow-sky-500/30"
        >
          <Sparkles size={18} />
          無料で体験する
        </Link>
        <div className="mt-5 flex justify-center gap-4 text-sm">
          <Link
            href="/register"
            className="text-slate-500 transition-colors hover:text-sky-500 dark:text-slate-400 dark:hover:text-sky-400"
          >
            アカウント作成
          </Link>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <Link
            href="/login"
            className="text-slate-500 transition-colors hover:text-sky-500 dark:text-slate-400 dark:hover:text-sky-400"
          >
            ログイン
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
