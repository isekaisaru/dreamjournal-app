"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";

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

export default function LandingFaq() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();

  return (
    <section className="border-t border-slate-200 px-4 py-16 dark:border-slate-800/50 sm:py-24">
      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-4xl"
      >
        <h2 className="mb-10 text-center text-xl font-bold text-slate-800 dark:text-slate-100 sm:text-2xl">
          よくある質問
        </h2>
        <dl className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white/70 dark:border-slate-700/40 dark:bg-slate-800/30"
            >
              <dt>
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={openFaq === i}
                >
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.q}</span>
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
                    className="px-5 pb-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400"
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
  );
}
