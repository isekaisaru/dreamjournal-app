"use client";

import { motion, type Variants, useReducedMotion } from "framer-motion";
import { Mic, Brain, TrendingUp, ImageIcon, Trees, Lock } from "lucide-react";

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

const FEATURES = [
  {
    title: "すぐ残せる",
    body: "テキストでも声でも。起きた瞬間の記憶を、消える前にキャッチする。",
    accent: "from-sky-400 to-blue-500",
    icon: <Mic size={16} className="text-sky-500 dark:text-sky-400" />,
  },
  {
    title: "意味が返る",
    body: "AIが夢をやさしい言葉で解釈。感情タグで、自分の気持ちに名前がつく。",
    accent: "from-purple-400 to-violet-500",
    icon: <Brain size={16} className="text-purple-500 dark:text-purple-400" />,
  },
  {
    title: "感情の可視化",
    body: "感情タグとムードカレンダーで、心の移り変わりをひと目で。",
    accent: "from-emerald-400 to-teal-500",
    icon: <TrendingUp size={16} className="text-emerald-500 dark:text-emerald-400" />,
  },
  {
    title: "夢を画像に",
    body: "記録した夢をもとに、AIが夢の世界をビジュアルで生成。言葉にできない雰囲気を形に残す。",
    accent: "from-pink-400 to-rose-500",
    icon: <ImageIcon size={16} className="text-pink-500 dark:text-pink-400" />,
  },
  {
    title: "夢の森が育つ",
    body: "記録するたびに木が育つ。続けるほど、あなただけの森が広がっていく。",
    accent: "from-green-400 to-emerald-500",
    icon: <Trees size={16} className="text-green-500 dark:text-green-400" />,
  },
];

export default function LandingFeatureGrid() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="features" className="px-4 py-16 sm:py-24">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((item, i) => (
          <motion.div
            key={item.title}
            custom={i}
            initial={reduceMotion ? undefined : "hidden"}
            whileInView="visible"
            viewport={{ once: true }}
            variants={reduceMotion ? undefined : fadeIn}
            className="text-center sm:text-left"
          >
            <div className={`mx-auto mb-4 h-1 w-10 rounded-full bg-gradient-to-r sm:mx-0 ${item.accent}`} />
            <div className="mb-2 flex items-center justify-center gap-1.5 sm:justify-start">
              {item.icon}
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{item.title}</h3>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.body}</p>
          </motion.div>
        ))}

        <motion.div
          custom={FEATURES.length}
          initial={reduceMotion ? undefined : "hidden"}
          whileInView="visible"
          viewport={{ once: true }}
          variants={reduceMotion ? undefined : fadeIn}
          className="flex flex-col justify-center rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50 to-transparent p-6 text-center dark:border-violet-500/20 dark:from-violet-500/10 dark:to-transparent sm:text-left"
        >
          <div className="mb-1.5 flex items-center justify-center gap-1.5 text-xs font-bold text-primary sm:justify-start">
            <Lock size={13} /> 完全プライベート
          </div>
          <h3 className="mb-2 font-bold text-slate-800 dark:text-slate-100">
            記録した夢は
            <br />
            自分だけに見える
          </h3>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            ランキングや公開機能はなく、安心して本音を残せます。
          </p>
        </motion.div>
      </div>
    </section>
  );
}
