"use client";

import type { DreamProfile, Dream } from "@/app/types";
import { getGrowthLevel, EMOTION_COLORS } from "@/lib/forest";

interface TreePreviewContentProps {
  profile: DreamProfile;
  recentDream: Dream | null;
  loading: boolean;
  onOpen: (profile: DreamProfile) => void;
}

function dreamTitle(dream: Dream): string | null {
  return typeof dream.title === "string" ? dream.title : null;
}

function dreamEmotions(dream: Dream): NonNullable<Dream["emotions"]> {
  return Array.isArray(dream.emotions) ? dream.emotions : [];
}

/**
 * 木のプレビュー中身（プロフィール見出し・直近の夢・CTA）。
 * データ取得は行わない純粋な表示コンポーネント。
 * モバイルの TreePreviewSheet（下シート）とデスクトップの TreeSidePanel（右パネル）から共有される。
 */
export default function TreePreviewContent({
  profile,
  recentDream,
  loading,
  onOpen,
}: TreePreviewContentProps) {
  const lvl = getGrowthLevel(profile.dreams_count ?? 0);
  const recentDreamTitle = recentDream ? dreamTitle(recentDream) : null;
  const recentDreamEmotions = recentDream ? dreamEmotions(recentDream) : [];

  return (
    <div>
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
            {lvl.name}（{lvl.reading}）・ ゆめ {profile.dreams_count ?? 0}こ
          </p>
        </div>
      </div>

      {/* recent dream */}
      {!loading && recentDream && recentDreamTitle && (
        <div className="mb-3 text-[13px] leading-relaxed text-white/80">
          <span className="text-white/50">さいきんの ゆめ：</span>
          「{recentDreamTitle}」
          {recentDreamEmotions.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {recentDreamEmotions.map((e) => (
                <span
                  key={e.id}
                  className="rounded-full px-2 py-0.5 text-[11.5px] font-bold"
                  style={{
                    background: `${EMOTION_COLORS[e.name] ?? profile.color}22`,
                    color: EMOTION_COLORS[e.name] ?? profile.color,
                  }}
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
        style={{
          background: `linear-gradient(135deg, ${profile.color}, #7c3aed)`,
          boxShadow: `0 8px 22px ${profile.color}44`,
        }}
        className="w-full rounded-[13px] py-2.5 text-[14.5px] font-black text-white"
      >
        この きを 見る ›
      </button>
    </div>
  );
}
