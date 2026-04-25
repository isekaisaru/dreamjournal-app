"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import MorpheusSVG, { type MorpheusExpression } from "./MorpheusSVG";
import MorpheusHero from "./MorpheusHero";
import MorpheusImage from "./MorpheusImage";

export interface MorpheusGuideProps {
  /** 表情 */
  expression: MorpheusExpression;
  /** 吹き出しタイトル（任意） */
  title?: string;
  /** 吹き出し本文 */
  message: string;
  /** モルペウスのサイズ px（デフォルト 72） */
  size?: number;
  /** 初期表示状態（デフォルト true） */
  defaultOpen?: boolean;
  /** 配置：fixed（画面固定）/ inline（インライン）*/
  placement?: "fixed" | "inline";
  /** fixed 時の位置クラス（デフォルト: 右下） */
  positionClassName?: string;
  /** 追加の className */
  className?: string;
}

export default function MorpheusGuide({
  expression,
  title,
  message,
  size = 96,
  defaultOpen = true,
  placement = "fixed",
  positionClassName = "bottom-6 right-4 sm:bottom-10 sm:right-8",
  className = "",
}: MorpheusGuideProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const wrapper =
    placement === "fixed"
      ? `fixed z-50 flex flex-col items-end gap-2 ${positionClassName} ${className}`
      : `flex flex-col items-end gap-2 ${className}`;

  return (
    <div className={wrapper}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="bubble"
            initial={{ opacity: 0, y: 10, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.92, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="relative max-w-[240px] sm:max-w-sm rounded-3xl bg-slate-900/90 px-4 py-3 text-sm text-slate-100 shadow-2xl ring-1 ring-white/15 backdrop-blur-sm
              before:absolute before:-right-2.5 before:bottom-5 before:h-0 before:w-0
              before:border-y-[8px] before:border-y-transparent
              before:border-l-[10px] before:border-l-slate-900/90
              before:content-['']"
          >
            <button
              type="button"
              aria-label="閉じる"
              onClick={() => setIsOpen(false)}
              className="absolute top-1.5 right-1.5 rounded-full p-1 text-slate-400 hover:bg-slate-700/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            {title && (
              <p className="font-bold text-sky-300 text-xs mb-1 pr-5">{title}</p>
            )}
            <p className="leading-relaxed text-slate-200/95 pr-4">{message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* モルペウス本体 */}
      <motion.button
        type="button"
        aria-label={isOpen ? "モルペウスを閉じる" : "モルペウスのメッセージを開く"}
        onClick={() => setIsOpen((v) => !v)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-full"
      >
        <MorpheusSVG
          expression={expression}
          size={size}
          className="drop-shadow-[0_12px_30px_rgba(56,189,248,0.38)]"
        />
      </motion.button>
    </div>
  );
}

// ──────────────────────────────────────────
// 画面ごとのプリセット（そのまま使える）
// ──────────────────────────────────────────

/** ランディングページ用 */
export function MorpheusGuideLanding() {
  return (
    <MorpheusGuide
      expression="dreaming"
      title="ようこそ、夢の世界へ…"
      message="ぼくはモルペウス。きみの夢を一緒に記録していくよ。"
      size={116}
    />
  );
}

/** ログインページ用 */
export function MorpheusGuideLogin() {
  return (
    <MorpheusGuide
      expression="cheerful"
      title="おかえり！"
      message="また来てくれたんだね。今日の夢、楽しみにしてたよ。"
      size={108}
    />
  );
}

/** ホームページ用（年齢層別メッセージは呼び出し側で渡す） */
export function MorpheusGuideHome({
  message,
  title,
}: {
  message: string;
  title?: string;
}) {
  return (
    <MorpheusGuide
      expression="curious"
      title={title}
      message={message}
      size={120}
      positionClassName="bottom-24 right-3 sm:bottom-10 sm:right-8"
      className="hidden sm:flex"
    />
  );
}

/** 夢詳細ページ用 */
export function MorpheusGuideDetail() {
  return (
    <MorpheusGuide
      expression="proud"
      title="すてきな夢だね。"
      message="ちゃんと記録できてえらいよ。分析結果も見てみてね。"
      size={110}
      positionClassName="bottom-6 left-4 sm:bottom-10 sm:left-8"
    />
  );
}

/** 空状態（夢がまだない）用 */
export function MorpheusGuideEmpty({ ageGroup }: { ageGroup?: string }) {
  const isSmallChild = ageGroup === "child_small" || ageGroup === "child";
  return (
    <MorpheusHero
      expression="sleeping"
      imageVariant="empty"
      variant="compose"
      title={isSmallChild ? "ゆめ、まだかな…" : "夢はまだありません"}
      message={
        isSmallChild
          ? "ねたら でてくるよ 🌙　おきたら モルペウスに おしえてね。"
          : "今夜みた夢を、起きたらすぐ記録してみてください。モルペウスがそばで待っています。"
      }
      size={210}
      className="w-full"
    />
  );
}

/** 新規作成ページ用 */
export function MorpheusGuideCompose() {
  return (
    <MorpheusHero
      expression="cheerful"
      imageVariant="compose"
      variant="compose"
      title="モルペウスに ゆめを おしえてね"
      message="さいしょは ひとことでも だいじょうぶ。おもいだせる ぶんだけ、ゆっくり かいてみよう。"
      size={220}
      className="w-full"
    />
  );
}

/** 夢分析中・読み解き中のインライン表示 */
export function MorpheusGuideAnalysis() {
  return <MorpheusImage variant="analysis" size={118} />;
}

/** ほめる・達成状態のインライン表示 */
export function MorpheusGuidePraise() {
  return <MorpheusImage variant="praise" size={132} />;
}
