"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Sparkles, Mic, Brain, TrendingUp, ImageIcon, ChevronDown, Lock } from "lucide-react";
import { motion, type Variants, AnimatePresence } from "framer-motion";
import { MorpheusGuideLanding } from "./MorpheusGuide";
import MorpheusImage from "./MorpheusImage";

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

const FAQ_ITEMS = [
  {
    q: "YumeTreeは何のアプリですか？",
    a: "YumeTreeは、朝の夢を忘れる前に記録し、AIガイドのモルペウスと一緒に感情や心の変化を振り返るプライベートAI夢ノートです。テキストでも音声でも記録でき、AI分析・感情タグ・夢の画像生成ができます。",
  },
  {
    q: "AI分析は医療診断ですか？",
    a: "いいえ。YumeTreeのAI分析は医療診断や心理診断ではありません。夢の記録を楽しく振り返るためのやさしいメッセージです。体調や心の不調が気になる場合は、医療機関にご相談ください。",
  },
  {
    q: "夢の内容は他人に公開されますか？",
    a: "いいえ、公開されません。YumeTreeに記録した夢はあなただけが見られます。ランキングやみんなの夢日記のような外部公開機能はなく、プライベートなノートとして管理されます。",
  },
  {
    q: "ひとりでも使えますか？",
    a: "はい。YumeTreeはひとりで使うことを基本に設計されています。自分の夢を毎朝記録して、モルペウスと一緒にゆっくり振り返るだけで十分楽しめます。",
  },
  {
    q: "家族・恋人・友達とも使えますか？",
    a: "はい。それぞれがアカウントを作って使っていただけます。夢の記録は各自のプライベートなノートですが、共通の話題として「昨夜こんな夢を見た」と話すきっかけにもなります。",
  },
  {
    q: "夢の画像生成とは何ですか？",
    a: "記録した夢の内容をもとに、AIが夢の世界をイラスト風の画像として生成する機能です。文字では残せない夢の雰囲気をビジュアルで保存できます。プレミアムプランで月31枚まで利用できます。",
  },
  {
    q: "無料で試せますか？",
    a: "はい。アカウント登録なしでもおためし体験ができます。アカウントを作ると夢の記録・AI分析・感情タグなど基本機能を無料でお使いいただけます。音声入力・画像生成・月次サマリーはプレミアムプランで利用可能です。",
  },
  {
    q: "モルペウスとは何ですか？",
    a: "モルペウスは、YumeTreeのAIガイドキャラクターです。ギリシャ神話の夢の神「モルペウス」からインスピレーションを受けており、あなたの夢をやさしい言葉で分析し、感情に寄り添ったメッセージを届けます。",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { authStatus } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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

      {/* ===== Hero ===== */}
      <section className="min-h-[75vh] flex flex-col items-center justify-center text-center px-4 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-8 rounded-[2rem] bg-white/10 p-3 ring-1 ring-white/10 backdrop-blur-sm"
        >
          <MorpheusImage
            variant="landing"
            size={180}
            priority
            className="animate-morpheus-float"
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
          <span className="text-slate-800 dark:text-slate-100">YumeTree</span>
          <br />
          <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            モルペウスと育てるAI夢ノート
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.6 }}
          className="text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed mb-10"
        >
          夢は、忘れるためのものじゃない。
          <br className="hidden sm:block" />
          声でもテキストでも、起きたままをそっと残す。
          <br className="hidden sm:block" />
          <span className="text-slate-700 dark:text-slate-200">AIが感情と意味を読み解き、</span>夢の世界を画像で形に。
          <br className="hidden sm:block" />
          ひとりでも、大切な人とも使えるプライベートな夢ノート。
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
          <div className="space-y-8">
            {/* Step 1: 入力 */}
            <motion.div variants={fadeIn} custom={0} className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center">
                <Mic className="text-sky-500 dark:text-sky-400" size={20} />
              </div>
              <div>
                <p className="text-xs text-sky-600 dark:text-sky-400 font-medium mb-1">声またはテキストで記録</p>
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
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">モルペウスのAI分析</p>
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

      {/* ===== Benefits: 4つの価値 ===== */}
      <section className="py-16 sm:py-24 px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {[
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
              title: "夢を画像に",
              body: "記録した夢をもとに、AIが夢の世界をビジュアルで生成。言葉にできない雰囲気を形に残す。",
              accent: "from-pink-400 to-rose-500",
              icon: <ImageIcon size={16} className="text-pink-500 dark:text-pink-400" />,
            },
            {
              title: "プライベート",
              body: "記録した夢は自分だけに見える。ランキングや公開機能はなく、安心して本音を残せる。",
              accent: "from-amber-400 to-orange-500",
              icon: <Lock size={16} className="text-amber-500 dark:text-amber-400" />,
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
              <div className="flex items-center gap-1.5 mb-2 justify-center sm:justify-start">
                {item.icon}
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">
                  {item.title}
                </h3>
              </div>
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
          <MorpheusImage
            variant="reward"
            size={120}
            className="mx-auto mb-6"
          />
          <p className="text-xl sm:text-2xl font-bold text-slate-700 dark:text-slate-200 mb-2">
            今夜の夢が、明日の気づきになる。
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mb-8">
            ひとりでも、恋人や家族・友達とも。あなたのペースで続けられます。
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

      {/* ===== FAQ ===== */}
      <section className="py-16 sm:py-24 px-4 border-t border-slate-200 dark:border-slate-800/50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 text-center mb-10">
            よくある質問
          </h2>
          <dl className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 dark:border-slate-700/40 bg-white/70 dark:bg-slate-800/30 overflow-hidden"
              >
                <dt>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
                    aria-expanded={openFaq === i}
                  >
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {item.q}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`flex-shrink-0 text-slate-400 transition-transform duration-200 ${
                        openFaq === i ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </dt>
                <AnimatePresence initial={false}>
                  {openFaq === i && (
                    <motion.dd
                      key="answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: "easeInOut" }}
                      className="px-5 pb-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed"
                    >
                      {item.a}
                    </motion.dd>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </dl>
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
