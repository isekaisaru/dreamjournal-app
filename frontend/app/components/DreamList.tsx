"use client";

import { Dream } from "@/app/types";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import DreamCard from "./DreamCard";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { MorpheusGuideEmpty } from "./MorpheusGuide";

interface DreamListProps {
  dreams: Dream[];
  onDelete?: (id: number) => void;
  /** 検索フィルターが有効な状態かどうか（空表示メッセージを切り替えるために使用） */
  isSearchActive?: boolean;
  /** 年齢層（空状態メッセージの切り替えに使用） */
  ageGroup?: string;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const moonPhases = [
  { icon: "🌑", label: "はじまり" },
  { icon: "🌒", label: "うまれそう" },
  { icon: "🌓", label: "ふくらむ" },
  { icon: "🌔", label: "もうすぐ" },
  { icon: "🌕", label: "きょうの ゆめ" },
];

const DreamList = ({ dreams, isSearchActive = false, ageGroup }: DreamListProps) => {
  return (
    <>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 p-4"
      >
        {dreams.length === 0 ? (
          isSearchActive ? (
            /* 検索結果ゼロ時の専用メッセージ */
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
              {/* モルペウスのキャラクターと吹き出し */}
              <div className="relative flex flex-col items-center mb-6">
                {/* 吹き出し */}
                <div className="relative bg-slate-800 border border-slate-700/60 rounded-2xl px-5 py-3 mb-3 shadow-md">
                  <p className="text-sm font-bold text-slate-100 leading-relaxed">
                    その ゆめは みつからなかったよ...
                  </p>
                  {/* 吹き出しの尻尾 */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-slate-700/60" />
                </div>
                {/* モルペウス画像 */}
                <Image
                  src="/images/morpheus.png"
                  alt="モルペウス"
                  width={72}
                  height={72}
                  className="opacity-90 drop-shadow-[0_4px_12px_rgba(56,189,248,0.3)]"
                />
              </div>
              <p className="text-sm text-muted-foreground mb-5">
                べつの ことばで さがしてみよう！
              </p>
              <Button
                asChild
                variant="outline"
                className="rounded-full px-6 text-base font-bold"
              >
                <Link href="/home">🔄 さがしなおす</Link>
              </Button>
            </div>
          ) : (
            /* 夢がまだない場合 — モルペウスガイド */
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center gap-6">
              <MorpheusGuideEmpty ageGroup={ageGroup} />
              <div className="rounded-3xl border border-border/70 bg-card/70 px-5 py-4 shadow-sm">
                <p className="text-sm font-semibold text-card-foreground">
                  こんやの ゆめカレンダー
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  {moonPhases.map((phase, index) => (
                    <div
                      key={phase.label}
                      className={`rounded-2xl px-3 py-2 text-center ${
                        index === moonPhases.length - 1
                          ? "bg-primary/12 ring-1 ring-primary/25"
                          : "bg-muted/55"
                      }`}
                    >
                      <div className="text-2xl leading-none">{phase.icon}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {phase.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Button asChild className="rounded-full px-6 text-base font-bold">
                <Link href="/dream/new">✏️ ゆめを かく</Link>
              </Button>
            </div>
          )
        ) : (
          dreams.map((dream) => (
            <motion.div key={dream.id} variants={item}>
              <DreamCard dream={dream} />
            </motion.div>
          ))
        )}
      </motion.div>
    </>
  );
};

export default DreamList;
