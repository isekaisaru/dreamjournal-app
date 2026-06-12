"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Link from "next/link";
import MorpheusImage from "@/app/components/MorpheusImage";

const SPARKS = Array.from({ length: 14 }, (_, i) => ({
  angle: (i / 14) * Math.PI * 2,
  delay: (i % 5) * 0.04,
}));

export default function HarvestCelebration({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative rounded-3xl bg-card p-6 text-center shadow-2xl"
            initial={reduceMotion ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弾ける光（視覚過敏配慮: reduced motion 時は飛散させない） */}
            <div className="relative mx-auto mb-3 h-20 w-20">
              {!reduceMotion &&
                SPARKS.map((s, i) => (
                <motion.span
                  key={i}
                  className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-amber-300"
                  initial={{ x: 0, y: 0, opacity: 1 }}
                  animate={{
                    x: Math.cos(s.angle) * 60,
                    y: Math.sin(s.angle) * 60,
                    opacity: 0,
                  }}
                  transition={{ duration: 0.9, delay: s.delay, ease: "easeOut" }}
                />
              ))}
              <div className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full">
                <MorpheusImage variant="praise" size={64} />
              </div>
            </div>
            <p className="text-lg font-bold text-card-foreground">みが なったよ！🌳</p>
            <p className="mt-1 text-sm text-muted-foreground">
              あたらしい ゆめが きに みのったよ。
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl bg-muted px-4 py-2 text-sm font-bold text-muted-foreground"
              >
                ホームへ
              </button>
              <Link
                href="/forest"
                className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
              >
                もりを みる
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
