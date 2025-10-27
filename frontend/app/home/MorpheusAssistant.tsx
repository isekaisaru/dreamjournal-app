"use client";

import Image from "next/image";
import { useEffect, useState, Fragment } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour >= 4 && hour < 10) {
    // 朝 4:00 ~ 9:59
    return {
      title: "おはようございます！",
      message:
        "昨晩は良い夢が見られましたか？忘れないうちに記録しておきましょう。",
    };
  }
  if (hour >= 10 && hour < 18) {
    // 昼 10:00 ~ 17:59
    return {
      title: "こんにちは！",
      message:
        "夢は、あなたの深層心理を映す鏡かもしれません。何か気づきはありましたか？",
    };
  }
  if (hour >= 18 && hour < 22) {
    // 夜 18:00 ~ 21:59
    return {
      title: "こんばんは。",
      message:
        "今日一日、お疲れ様でした。今夜見る夢のヒントが隠されているかもしれません。",
    };
  }
  // 深夜 22:00 ~ 3:59
  return {
    title: "おやすみなさい…",
    message: "良い夢を。また明日、あなたの夢の話を聞かせてくださいね。",
  };
};

const defaultGreeting = {
  title: "ユメログへようこそ！",
  message: "今日の夢を記録してみませんか？",
};

export default function MorpheusAssistant() {
  const [isBubbleOpen, setIsBubbleOpen] = useState(true);
  const [greeting, setGreeting] = useState(defaultGreeting);

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-10 right-8 hidden sm:flex flex-col items-end gap-3 z-50 animate-morpheus-entry">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isBubbleOpen}
        onClick={() => setIsBubbleOpen((prev) => !prev)}
        className="pointer-events-auto group relative focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-400 focus-visible:ring-offset-transparent"
      >
        <span className="sr-only">モルペウスからメッセージを開く</span>
        <Image
          src="/images/morpheus.png"
          alt="夢の番人モルペウス"
          width={240}
          height={240}
          priority
          className="h-40 w-40 sm:h-44 sm:w-44 md:h-52 md:w-52 lg:h-56 lg:w-56 opacity-90 transition-transform duration-500 ease-out group-hover:opacity-100 group-hover:scale-[1.08] drop-shadow-[0_16px_35px_rgba(56,189,248,0.35)] animate-morpheus-float group-hover:animate-none"
        />
      </button>

      <AnimatePresence>
        {isBubbleOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: 10,
              scale: 0.95,
              transition: { duration: 0.15 },
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              duration: 0.2,
            }}
            role="dialog"
            onClick={() => setIsBubbleOpen(false)}
            aria-live="polite"
            className="pointer-events-auto relative max-w-xs cursor-pointer rounded-2xl bg-slate-900/85 p-4 text-sm text-slate-100 shadow-xl ring-1 ring-white/15 backdrop-blur before:absolute before:-right-3 before:bottom-6 before:h-0 before:w-0 before:border-y-[10px] before:border-y-transparent before:border-l-[12px] before:border-l-slate-900/85 before:content-['']"
          >
            <button
              type="button"
              aria-label="閉じる"
              onClick={(e) => {
                e.stopPropagation(); // 親要素のonClickが発火しないようにする
                setIsBubbleOpen(false);
              }}
              className="absolute top-2 right-2 p-1 rounded-full text-slate-300 hover:bg-slate-700/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="font-semibold text-sky-200">{greeting.title}</p>
            <p className="mt-1 pr-4 leading-relaxed text-slate-200/90">
              {greeting.message}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
