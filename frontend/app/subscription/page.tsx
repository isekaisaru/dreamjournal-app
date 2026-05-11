"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Check, Zap, Image as ImageIcon, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import MorpheusSmall from "@/app/components/MorpheusSmall";
import MorpheusHero from "@/app/components/MorpheusHero";
import MorpheusLoginRequired from "@/app/components/MorpheusLoginRequired";
import { useAuth } from "@/context/AuthContext";
import Loading from "../loading";

const FREE_FEATURES = [
  { label: "AI分析", detail: "月10回まで" },
  { label: "夢の記録", detail: "無制限" },
  { label: "感情タグ", detail: "利用可" },
  { label: "月次サマリー", detail: "利用不可" },
  { label: "夢の画像生成", detail: "利用不可" },
];

const PREMIUM_FEATURES = [
  { label: "AI分析", detail: "たっぷり使える" },
  { label: "夢の記録", detail: "無制限" },
  { label: "感情タグ", detail: "利用可" },
  { label: "月次サマリー", detail: "月ごとのAIまとめ" },
  { label: "夢の画像生成", detail: "月31枚" },
];

const HIGHLIGHTS = [
  {
    icon: Zap,
    title: "AI分析 たっぷり使える",
    body: "フリープランの月10回制限がなくなり、毎日の夢をしっかり分析できる。",
    color: "text-sky-400",
    bg: "bg-sky-500/10",
  },
  {
    icon: ImageIcon,
    title: "夢のビジュアル化",
    body: "gpt-image-1 が夢の世界を絵にする。月31枚まで生成できる。",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    icon: BarChart3,
    title: "月次サマリー",
    body: "AIがその月の夢をまとめて振り返り。気づかなかった自分に出会える。",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
];

export default function SubscriptionPage() {
  const { user, authStatus } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "premium" }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.url) {
        throw new Error("決済ページの準備に失敗しました。");
      }

      window.location.assign(data.url);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "エラーが発生しました。"
      );
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.url) {
        throw new Error("管理ページの準備に失敗しました。");
      }

      window.location.assign(data.url);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "エラーが発生しました。"
      );
      setIsLoading(false);
    }
  };

  if (authStatus === "checking") {
    return <Loading />;
  }

  if (authStatus === "unauthenticated") {
    return (
      <MorpheusLoginRequired
        title="プレミアムに登録するにはログインが必要だよ"
        message="まずログインしてから、プレミアムの詳細をご確認ください。アカウントをお持ちでない場合は、まず無料で試せます。"
      />
    );
  }

  // すでにプレミアム会員の場合
  if (user?.premium) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="container mx-auto max-w-2xl px-4 py-16">
          <MorpheusHero
            expression="proud"
            imageVariant="praise"
            variant="home"
            size={160}
            title="プレミアム会員です ✨"
            message="すべての機能をご利用いただけます。毎日の夢を存分に記録・分析してください！"
            className="mb-8"
          />
          <section className="rounded-2xl border border-border/60 bg-card/70 p-6 text-center shadow-sm backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Link
                href="/home"
                className="inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                夢日記へ戻る
              </Link>
              <button
                type="button"
                onClick={handleManageSubscription}
                disabled={isLoading}
                className="inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-xl border border-border px-6 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "準備中..." : "サブスクリプションを管理する"}
              </button>
            </div>
            {errorMessage && (
              <p className="mt-4 text-sm font-medium text-destructive">
                {errorMessage}
              </p>
            )}
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto max-w-3xl px-4 py-12 space-y-10">

        {/* Hero */}
        <MorpheusHero
          expression="cheerful"
          imageVariant="reward"
          variant="home"
          size={160}
          title="ユメログ プレミアム"
          message="AI分析をたっぷり使える。夢の画像生成と月次サマリーで、毎日の夢がもっと深く楽しめる。"
        />

        {/* 価格カード */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="rounded-3xl border-2 border-primary/30 bg-primary/5 p-6 text-center shadow-lg"
        >
          <p className="text-xs font-bold tracking-widest text-primary uppercase mb-2">月額プラン</p>
          <div className="flex items-end justify-center gap-1 mb-1">
            <span className="text-5xl font-black text-foreground">¥590</span>
            <span className="text-muted-foreground mb-2 text-sm">/ 月</span>
          </div>
          <p className="text-xs text-muted-foreground mb-6">税込み・いつでもキャンセル可能</p>

          <button
            type="button"
            onClick={handleSubscribe}
            disabled={isLoading}
            className="inline-flex items-center gap-2.5 px-10 py-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-base rounded-2xl shadow-xl shadow-sky-500/20 transition-all duration-300 hover:shadow-2xl hover:shadow-sky-500/30 hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-60 disabled:translate-y-0"
          >
            <Sparkles size={18} />
            {isLoading ? "準備中..." : "プレミアムを始める"}
          </button>

          {errorMessage && (
            <p className="mt-4 text-sm font-medium text-destructive">
              {errorMessage}
            </p>
          )}
        </motion.section>

        {/* ハイライト機能 */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="grid gap-4 sm:grid-cols-3"
        >
          {HIGHLIGHTS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-border/60 bg-card/70 p-5 shadow-sm"
              >
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${item.bg} mb-3`}>
                  <Icon className={`${item.color} h-5 w-5`} />
                </div>
                <h3 className="font-bold text-foreground mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
              </div>
            );
          })}
        </motion.section>

        {/* フリー vs プレミアム 比較表 */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="rounded-2xl border border-border/60 bg-card/70 overflow-hidden shadow-sm"
        >
          <div className="grid grid-cols-3 bg-muted/50 px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span>機能</span>
            <span className="text-center">フリー</span>
            <span className="text-center text-primary">プレミアム</span>
          </div>
          {FREE_FEATURES.map((free, i) => {
            const premium = PREMIUM_FEATURES[i];
            const isUpgrade = free.detail !== premium.detail;
            return (
              <div
                key={free.label}
                className="grid grid-cols-3 items-center px-4 py-3 border-t border-border/40 text-sm"
              >
                <span className="font-medium text-foreground">{free.label}</span>
                <span className="text-center text-muted-foreground">{free.detail}</span>
                <span className={`text-center font-semibold flex items-center justify-center gap-1 ${isUpgrade ? "text-primary" : "text-muted-foreground"}`}>
                  {isUpgrade && <Check className="h-3.5 w-3.5 shrink-0" />}
                  {premium.detail}
                </span>
              </div>
            );
          })}
        </motion.section>

        {/* 利用規約注記 */}
        <p className="text-xs text-muted-foreground text-center leading-loose">
          ※ AI分析は通常利用の範囲内でご利用いただけます。<br />
          ※ 夢の画像生成は月31枚までです。<br />
          ※ 短時間の連続利用など、サービス運営に影響する利用は一時的に制限される場合があります。
        </p>

        {/* モルペウスのメッセージ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.5 }}
        >
          <MorpheusSmall
            title="まいにちの ゆめを もっと ふかく！"
            message="プレミアムにすると、ゆめのぶんせきが まいにちできるよ。ゆめの絵もかけるし、まとめも みられる。きみの ゆめを いっしょに そだてよう！"
            imageVariant="analysis"
          />
        </motion.div>

        {/* 下部CTA */}
        <div className="text-center pb-8">
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={isLoading}
            className="inline-flex items-center gap-2.5 px-10 py-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-base rounded-2xl shadow-xl shadow-sky-500/20 transition-all duration-300 hover:shadow-2xl hover:shadow-sky-500/30 hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-60 disabled:translate-y-0"
          >
            <Sparkles size={18} />
            {isLoading ? "準備中..." : "月額¥590でプレミアムを始める"}
          </button>
          <p className="mt-3 text-xs text-muted-foreground">いつでもキャンセル可能 · Stripe で安全に決済</p>
          <p className="mt-5 text-sm text-muted-foreground">
            <Link href="/home" className="underline underline-offset-2 hover:text-foreground transition-colors">
              フリープランのままにする
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
