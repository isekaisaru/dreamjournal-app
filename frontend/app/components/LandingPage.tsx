"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, Mic, Brain, TrendingUp } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { MorpheusGuideLanding } from "./MorpheusGuide";

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

export default function LandingPage() {
  const router = useRouter();
  const { authStatus } = useAuth();

  useEffect(() => {
    if (authStatus === "authenticated") {
      router.replace("/home");
    }
  }, [authStatus, router]);

  if (authStatus === "checking") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
      </div>
    );
  }

  if (authStatus === "authenticated") return null;

  return (
    <div className="relative isolate max-w-4xl mx-auto overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] dark:hidden"
      >
        <div className="absolute left-[-8%] top-12 h-56 w-56 rounded-full bg-sky-200/70 blur-3xl" />
        <div className="absolute right-[-10%] top-24 h-64 w-64 rounded-full bg-blue-100 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-slate-100/90 via-white to-transparent" />
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 hidden h-[32rem] dark:block"
      >
        <div className="absolute left-[-8%] top-8 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute right-[-10%] top-20 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      {/* ===== Hero: 世界観で引き込む ===== */}
      <section className="min-h-[75vh] flex flex-col items-center justify-center text-center px-4 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-8"
        >
          <Image
            src="/images/morpheus.png"
            alt="モルペウス"
            width={140}
            height={140}
            sizes="140px"
            className="drop-shadow-[0_8px_32px_rgba(56,189,248,0.5)] animate-morpheus-float"
            priority
          />
          <Sparkles
            className="absolute -top-3 -right-3 text-yellow-400/80 dark:text-yellow-300/80 animate-pulse"
            size={20}
          />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-6"
        >
          <span className="text-slate-800 dark:text-slate-100">夢は、</span>
          <br />
          <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            忘れるためのものじゃない。
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.6 }}
          className="text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed mb-10"
        >
          朝の数分で夢を残す。AIが意味と感情を返す。
          <br className="hidden sm:block" />
          親子で使える、
          <span className="text-slate-700 dark:text-slate-200">心のセルフケア</span>
          アプリ。
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.5 }}
        >
          <Link
            href="/trial"
            className="
              inline-flex items-center gap-2.5 px-10 py-4
              bg-gradient-to-r from-sky-500 to-blue-600
              hover:from-sky-400 hover:to-blue-500
              text-white font-bold text-base sm:text-lg rounded-2xl
              shadow-xl shadow-sky-500/20
              transition-all duration-300 hover:shadow-2xl hover:shadow-sky-500/30 hover:-translate-y-1
            "
          >
            <Sparkles size={20} />
            今朝の夢を入れてみる
          </Link>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-4">
            無料のおためしアカウントでAI分析を体験できます
          </p>
        </motion.div>
      </section>

      {/* ===== Product Proof: 体験の流れを見せる ===== */}
      <section className="py-16 sm:py-24 px-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="
            relative max-w-2xl mx-auto
            p-6 sm:p-10 rounded-3xl
            bg-slate-100/80 dark:bg-slate-800/40
            border border-slate-200/80 dark:border-slate-700/30
            backdrop-blur-sm
          "
        >
          {/* ステップフロー */}
          <div className="space-y-8">
            {/* Step 1: 入力 */}
            <motion.div variants={fadeIn} custom={0} className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center">
                <Mic className="text-sky-500 dark:text-sky-400" size={20} />
              </div>
              <div>
                <p className="text-xs text-sky-600 dark:text-sky-400 font-medium mb-1">あなたの夢</p>
                <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/40">
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    「空を飛んでいた。すごく気持ちよくて、
                    <br className="hidden sm:block" />
                    雲の上に誰かが待っている気がした」
                  </p>
                </div>
              </div>
            </motion.div>

            {/* 矢印 */}
            <motion.div variants={fadeIn} custom={1} className="flex justify-center">
              <div className="w-px h-8 bg-gradient-to-b from-sky-500/40 to-purple-500/40" />
            </motion.div>

            {/* Step 2: AI分析結果 */}
            <motion.div variants={fadeIn} custom={2} className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
                <Brain className="text-purple-500 dark:text-purple-400" size={20} />
              </div>
              <div>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">モルペウスの分析</p>
                <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/40">
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    「すごいゆめだね！そらをとぶゆめは、
                    <br className="hidden sm:block" />
                    きみが <span className="text-sky-500 dark:text-sky-300">あたらしいことにちょうせん</span> したい
                    <br className="hidden sm:block" />
                    きもちのあらわれだよ」
                  </p>
                </div>
              </div>
            </motion.div>

            {/* 矢印 */}
            <motion.div variants={fadeIn} custom={3} className="flex justify-center">
              <div className="w-px h-8 bg-gradient-to-b from-purple-500/40 to-amber-500/40" />
            </motion.div>

            {/* Step 3: 感情タグ */}
            <motion.div variants={fadeIn} custom={4} className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <TrendingUp className="text-amber-500 dark:text-amber-400" size={20} />
              </div>
              <div>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">感情タグ</p>
                <div className="flex gap-2 flex-wrap">
                  {["わくわく", "自由", "期待"].map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-300/60 dark:border-sky-500/20"
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

      {/* ===== Benefits: 変化を3つだけ ===== */}
      <section className="py-16 sm:py-24 px-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {[
            {
              title: "すぐ残せる",
              body: "テキストでも声でも。起きた瞬間の記憶を、消える前にキャッチする。",
              accent: "from-sky-400 to-blue-500",
            },
            {
              title: "意味が返る",
              body: "AIが夢をやさしい言葉で解釈。感情タグで、自分の気持ちに名前がつく。",
              accent: "from-purple-400 to-violet-500",
            },
            {
              title: "自分が見える",
              body: "続けるほど蓄積される心のログ。統計で、気づかなかった自分に出会える。",
              accent: "from-amber-400 to-orange-500",
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
              className="text-center sm:text-left"
            >
              <div
                className={`h-1 w-10 rounded-full bg-gradient-to-r ${item.accent} mb-4 mx-auto sm:mx-0`}
              />
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {item.body}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="py-16 sm:py-24 text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Image
            src="/images/morpheus.png"
            alt="モルペウス"
            width={80}
            height={80}
            sizes="80px"
            className="mx-auto mb-6 drop-shadow-[0_4px_20px_rgba(56,189,248,0.35)]"
          />
          <p className="text-xl sm:text-2xl font-bold text-slate-700 dark:text-slate-200 mb-2">
            今夜の夢が、明日の気づきになる。
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mb-8">
            お子さまの夢も、あなたの夢も。家族の心のログを残しませんか？
          </p>
          <Link
            href="/trial"
            className="
              inline-flex items-center gap-2.5 px-10 py-4
              bg-gradient-to-r from-sky-500 to-blue-600
              hover:from-sky-400 hover:to-blue-500
              text-white font-bold text-base rounded-2xl
              shadow-xl shadow-sky-500/20
              transition-all duration-300 hover:shadow-2xl hover:shadow-sky-500/30 hover:-translate-y-1
            "
          >
            <Sparkles size={18} />
            無料で体験する
          </Link>
          <div className="flex gap-4 justify-center mt-5 text-sm">
            <Link
              href="/register"
              className="text-slate-500 dark:text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 transition-colors"
            >
              アカウント作成
            </Link>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <Link
              href="/login"
              className="text-slate-500 dark:text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 transition-colors"
            >
              ログイン
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ===== Tech Stack: 控えめに最下部 ===== */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="py-8 px-4 border-t border-slate-200 dark:border-slate-800/50"
      >
        <p className="text-xs text-slate-500 dark:text-slate-600 text-center mb-3">Built with</p>
        <div className="flex flex-wrap gap-1.5 justify-center max-w-lg mx-auto">
          {[
            "Next.js", "React", "TypeScript", "Tailwind CSS",
            "Ruby on Rails", "PostgreSQL", "OpenAI API", "Stripe",
            "Vercel", "Render",
          ].map((tech) => (
            <span
              key={tech}
              className="px-2.5 py-1 rounded-full text-[10px] font-medium text-slate-500 dark:text-slate-500 border border-slate-200 dark:border-slate-800/60 bg-white/70 dark:bg-transparent"
            >
              {tech}
            </span>
          ))}
        </div>
      </motion.section>
      <MorpheusGuideLanding />
    </div>
  );
}
