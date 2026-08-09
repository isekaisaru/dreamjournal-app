"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { DreamProfile, Dream } from "@/app/types";
import TreePreviewContent from "./TreePreviewContent";

interface TreePreviewSheetProps {
  profile: DreamProfile | null;
  recentDream: Dream | null;
  loading: boolean;
  onOpen: (profile: DreamProfile) => void;
  onPeekRoom: (profile: DreamProfile) => void;
  onClose: () => void;
}

/**
 * 木をタップしたときに下からスライドアップするプレビューシート（lg未満のみ表示）。
 * lg+ では TreeSidePanel が同じ役割を常駐パネルとして担うため、ここは lg:hidden で隠す
 * （DOM 自体は常にマウントし、hidden クラスで出し分ける）。
 * 中身（プロフィール見出し・直近の夢・CTA・へやを のぞく）は TreePreviewContent と共通。
 */
export default function TreePreviewSheet({
  profile,
  recentDream,
  loading,
  onOpen,
  onPeekRoom,
  onClose,
}: TreePreviewSheetProps) {
  return (
    <AnimatePresence>
      {profile && (
        <motion.div
          key={profile.id}
          data-testid="tree-preview-sheet"
          initial={{ y: 32, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 24, opacity: 0, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          style={{ borderColor: `${profile.color}55` }}
          className="absolute bottom-4 left-1/2 z-[45] w-[min(420px,calc(100%-120px))] -translate-x-1/2 rounded-[22px] border bg-gradient-to-br from-[rgba(28,26,60,0.96)] to-[rgba(16,14,40,0.96)] p-4 text-white shadow-[0_20px_50px_rgba(6,4,20,0.55)] lg:hidden"
        >
          {/* close */}
          <button
            onClick={onClose}
            aria-label="とじる"
            className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <TreePreviewContent
            profile={profile}
            recentDream={recentDream}
            loading={loading}
            onOpen={onOpen}
            onPeekRoom={onPeekRoom}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
