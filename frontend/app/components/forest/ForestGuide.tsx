"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { X } from "lucide-react";
import MorpheusImage from "@/app/components/MorpheusImage";
import { getGrowthLevel } from "@/lib/forest";
import type { DreamProfile } from "@/app/types";

type Props =
  | { variant: "forest"; profiles: DreamProfile[] }
  | { variant: "tree"; profile: DreamProfile; dreamCount: number };

function buildMessage(props: Props): { title: string; body: string } {
  if (props.variant === "forest") {
    const empty = props.profiles.find((p) => (p.dreams_count ?? 0) === 0);
    if (empty) {
      return {
        title: "ゆめの もり へ ようこそ",
        body: `${empty.name}の きは まだ めを だした ばかり。ゆめを かいて そだてよう。`,
      };
    }
    return {
      title: "ゆめの もり へ ようこそ",
      body: "きを タップ すると、そのこの ゆめの きを ゆっくり みられるよ。",
    };
  }
  const { name } = getGrowthLevel(props.dreamCount);
  return {
    title: `${props.profile.name}の き`,
    body:
      props.dreamCount === 0
        ? "まだ みが ないね。ゆめを かいて さいしょの みを ならせよう。"
        : `いまは「${name}」まで そだったよ。この ちょうしで つづけよう！`,
  };
}

export default function ForestGuide(props: Props) {
  const [open, setOpen] = useState(true);
  const { title, body } = buildMessage(props);
  const variantImg = props.variant === "forest" ? "home" : "praise";

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-end gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.9 }}
            className="relative mb-2 max-w-[220px] rounded-2xl border border-border/50 bg-card p-3 text-card-foreground shadow-xl"
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute -right-2 -top-2 rounded-full bg-muted p-1 text-muted-foreground"
              aria-label="とじる"
            >
              <X className="h-3 w-3" />
            </button>
            <p className="text-sm font-bold">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
            <Link
              href="/home"
              className="mt-2 inline-block rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
            >
              ゆめを かく
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="モルペウスと はなす"
        className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-card shadow-lg ring-2 ring-primary/40"
      >
        <MorpheusImage variant={variantImg} size={60} />
      </button>
    </div>
  );
}
