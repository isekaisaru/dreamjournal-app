"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { X } from "lucide-react";
import type { DreamProfile, Dream } from "@/app/types";
import { getGrowthLevel, EMOTION_COLORS } from "@/lib/forest";
import { getDreamsForProfile } from "@/lib/apiClient";

interface TreePreviewSheetProps {
  profile: DreamProfile | null;
  onOpen: (profile: DreamProfile) => void;
  onClose: () => void;
}

/**
 * 木をタップしたときに下からスライドアップするプレビューシート。
 * プロフィール・直近の夢・感情タグを表示し、「この きを 見る ›」で詳細へ遷移。
 *
 * データ要件:
 *  - profile.dreams_count は getDreamProfiles() で取得済み。
 *  - 直近の夢（title, emotions）は getDreamsForProfile() で lazy-fetch する。
 *    ネットワーク負荷が気になるなら、ForestScene 側でプリフェッチして渡してもよい。
 */
export default function TreePreviewSheet({ profile, onOpen, onClose }: TreePreviewSheetProps) {
  const [recentDream, setRecentDream] = useState<Dream | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile) { setRecentDream(null); return; }
    let cancelled = false;
    setLoading(true);
    getDreamsForProfile(profile.id)
      .then((dreams) => { if (!cancelled) setRecentDream(dreams[0] ?? null); })
      .catch(() => {/* silently ignore — sheet still useful without recent dream */})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [profile?.id]);

  const lvl = profile ? getGrowthLevel(profile.dreams_count ?? 0) : null;

  return (
    <AnimatePresence>
      {profile && (
        <motion.div
          key={profile.id}
          initial={{ y: 32, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 24, opacity: 0, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          style={{ borderColor: `${profile.color}55` }}
          className="absolute bottom-4 left-1/2 z-[45] w-[min(420px,calc(100%-120px))] -translate-x-1/2 rounded-[22px] border bg-gradient-to-br from-[rgba(28,26,60,0.96)] to-[rgba(16,14,40,0.96)] p-4 text-white shadow-[0_20px_50px_rgba(6,4,20,0.55)]"
        >
          {/* close */}
          <button
            onClick={onClose}
            aria-label="とじる"
            className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          {/* header */}
          <div className="mb-2.5 flex items-center gap-2.5">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-2xl"
              style={{ background: `${profile.color}26`, border: `1.5px solid ${profile.color}88` }}
            >
              {profile.avatar_emoji}
            </div>
            <div>
              <p className="text-[17px] font-black">{profile.name}の き</p>
              <p className="text-[12.5px] font-bold" style={{ color: profile.color }}>
                {lvl?.name}（{lvl?.reading}）・ ゆめ {profile.dreams_count ?? 0}こ
              </p>
            </div>
          </div>

          {/* recent dream */}
          {!loading && recentDream && (
            <div className="mb-3 text-[13px] leading-relaxed text-white/80">
              <span className="text-white/50">さいきんの ゆめ：</span>
              「{recentDream.title}」
              {(recentDream.emotions?.length ?? 0) > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {recentDream.emotions!.map((e) => (
                    <span
                      key={e.id}
                      className="rounded-full px-2 py-0.5 text-[11.5px] font-bold"
                      style={{ background: `${EMOTION_COLORS[e.name] ?? profile.color}22`, color: EMOTION_COLORS[e.name] ?? profile.color }}
                    >
                      {e.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          {loading && <p className="mb-3 text-[12px] text-white/40">よみこんでいるよ…</p>}

          {/* CTA */}
          <button
            onClick={() => onOpen(profile)}
            style={{ background: `linear-gradient(135deg, ${profile.color}, #7c3aed)`, boxShadow: `0 8px 22px ${profile.color}44` }}
            className="w-full rounded-[13px] py-2.5 text-[14.5px] font-black text-white"
          >
            この きを 見る ›
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
