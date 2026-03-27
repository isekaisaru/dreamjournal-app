"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import Link from "next/link";
import { Moon, Sparkles, BookOpen, Brain, Mic, BarChart3, Shield, Heart } from "lucide-react";
import { motion, type Variants } from "framer-motion";

// フェードイン + スライドアップのアニメーション
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.12,
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

const features = [
  {
    icon: Brain,
    title: "AI夢分析",
    description:
      "モルペウスがやさしい言葉で夢の意味を教えてくれます。感情タグも自動で付与。",
    color: "text-sky-400",
    bg: "bg-sky-400/10",
  },
  {
    icon: BookOpen,
    title: "夢日記",
    description:
      "テキストで夢を記録。検索・月別アーカイブで過去の夢をいつでも振り返れます。",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
  {
    icon: Mic,
    title: "音声入力",
    description:
      "起きたばかりでも大丈夫。声で夢を録音すると、AIが文字起こし＋分析します。",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  {
    icon: BarChart3,
    title: "感情の可視化",
    description:
      "感情タグの統計・連続記録バッジで、心の変化を見える化します。",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  {
    icon: Shield,
    title: "安心設計",
    description:
      "お子さまにもやさしいUI。夢のデータは暗号化通信で保護されています。",
    color: "text-rose-400",
    bg: "bg-rose-400/10",
  },
  {
    icon: Heart,
    title: "家族で使える",
    description:
      "6歳でもわかる分析結果。親子で「きのうどんな夢みた？」を楽しめます。",
    color: "text-pink-400",
    bg: "bg-pink-400/10",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { authStatus } = useAuth();

  // 認証済みならホームへリダイレクト
  useEffect(() => {
    if (authStatus === "authenticated") {
      router.replace("/home");
    }
  }, [authStatus, router]);

  // 認証チェック中
  if (authStatus === "checking") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Moon className="animate-pulse mr-2" size={20} />
        読み込み中...
      </div>
    );
  }

  // 認証済みの場合はリダイレクト待ち
  if (authStatus === "authenticated") {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto py-6 sm:py-10">
      {/* ===== Hero Section ===== */}
      <section className="text-center py-10 sm:py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-6"
        >
          <div className="relative inline-block">
            <Image
              src="/images/morpheus.png"
              alt="モルペウス - 夢占い博士"
              width={120}
              height={120}
              className="drop-shadow-[0_4px_20px_rgba(56,189,248,0.4)] animate-morpheus-float"
              priority
            />
            <Sparkles
              className="absolute -top-2 -right-2 text-yellow-300 animate-pulse"
              size={24}
            />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4"
        >
          <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            ユメログ
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed mb-3"
        >
          まいにちの夢をAIが分析。
          <br className="hidden sm:block" />
          感情タグ・検索・統計で
          <span className="text-sky-300 font-semibold">心の変化を見える化</span>
          するセルフケアアプリ。
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-sm text-slate-400 mb-8"
        >
          夢占い博士「モルペウス」が、やさしい言葉で夢の意味を教えてくれます
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Link
            href="/trial"
            className="
              inline-flex items-center gap-2 px-8 py-3.5
              bg-gradient-to-r from-sky-500 to-blue-600
              hover:from-sky-400 hover:to-blue-500
              text-white font-bold text-base rounded-xl
              shadow-lg shadow-sky-500/25
              transition-all duration-200 hover:shadow-xl hover:shadow-sky-500/30 hover:-translate-y-0.5
            "
          >
            <Sparkles size={18} />
            登録なしで試してみる
          </Link>
          <Link
            href="/register"
            className="
              inline-flex items-center gap-2 px-8 py-3.5
              bg-slate-800/80 hover:bg-slate-700/80
              text-slate-200 font-bold text-base rounded-xl
              border border-slate-600/50 hover:border-sky-500/50
              transition-all duration-200 hover:-translate-y-0.5
            "
          >
            無料アカウント作成
          </Link>
        </motion.div>
      </section>

      {/* ===== Features Grid ===== */}
      <section className="py-10 sm:py-16">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-xl sm:text-2xl font-bold text-center mb-10"
        >
          <Moon className="inline mr-2 text-blue-300" size={24} />
          ユメログでできること
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={fadeInUp}
              className="
                p-6 rounded-2xl
                bg-slate-800/50 border border-slate-700/50
                hover:border-sky-500/30 hover:bg-slate-800/70
                transition-all duration-300
              "
            >
              <div
                className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${feature.bg} mb-4`}
              >
                <feature.icon className={feature.color} size={22} />
              </div>
              <h3 className="font-bold text-base mb-2 text-slate-100">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== How It Works ===== */}
      <section className="py-10 sm:py-16">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-xl sm:text-2xl font-bold text-center mb-10"
        >
          <Sparkles className="inline mr-2 text-yellow-300" size={24} />
          かんたん3ステップ
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {[
            {
              step: "1",
              title: "夢を記録する",
              desc: "テキストで書くか、声で録音。起きたらすぐ記録できます。",
              emoji: "📝",
            },
            {
              step: "2",
              title: "AIが分析",
              desc: "モルペウスが夢の意味をやさしく解説。感情タグも自動付与。",
              emoji: "🔮",
            },
            {
              step: "3",
              title: "心の変化を見る",
              desc: "統計・アーカイブで感情の変化を可視化。自分を知るきっかけに。",
              emoji: "📊",
            },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="text-center"
            >
              <div className="text-4xl mb-3">{item.emoji}</div>
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 font-bold text-sm mb-3">
                {item.step}
              </div>
              <h3 className="font-bold text-base mb-2 text-slate-100">
                {item.title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== Tech Stack (Portfolio向け) ===== */}
      <section className="py-10 sm:py-12">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="
            p-6 sm:p-8 rounded-2xl
            bg-slate-800/40 border border-slate-700/40
            text-center
          "
        >
          <h2 className="text-lg sm:text-xl font-bold mb-4 text-slate-200">
            技術スタック
          </h2>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              "Next.js",
              "React",
              "TypeScript",
              "Tailwind CSS",
              "Ruby on Rails",
              "PostgreSQL",
              "OpenAI API",
              "Stripe",
              "JWT",
              "Vercel",
              "Render",
              "Sentry",
            ].map((tech) => (
              <span
                key={tech}
                className="
                  px-3 py-1.5 rounded-full text-xs font-medium
                  bg-slate-700/60 text-slate-300 border border-slate-600/40
                "
              >
                {tech}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-4">
            フロントエンド(Vercel) + バックエンドAPI(Render) のクロスドメイン構成
          </p>
        </motion.div>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="py-10 sm:py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Image
            src="/images/morpheus.png"
            alt="モルペウス"
            width={80}
            height={80}
            className="mx-auto mb-4 drop-shadow-[0_4px_16px_rgba(56,189,248,0.3)]"
          />
          <p className="text-base sm:text-lg text-slate-300 mb-6">
            さあ、今夜見た夢を記録してみよう
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/trial"
              className="
                inline-flex items-center gap-2 px-8 py-3.5
                bg-gradient-to-r from-sky-500 to-blue-600
                hover:from-sky-400 hover:to-blue-500
                text-white font-bold rounded-xl
                shadow-lg shadow-sky-500/25
                transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5
              "
            >
              <Sparkles size={18} />
              無料で始める
            </Link>
            <Link
              href="/login"
              className="
                inline-flex items-center gap-2 px-6 py-3
                text-slate-400 hover:text-sky-400
                text-sm font-medium
                transition-colors duration-200
              "
            >
              アカウントをお持ちの方はログイン
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
