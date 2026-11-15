"use client";

import type { DreamProfile, Dream } from "@/app/types";
import ForestTodayCard from "./ForestTodayCard";
import TreePreviewContent from "./TreePreviewContent";

interface TreeSidePanelProps {
  profiles: DreamProfile[];
  selectedProfile: DreamProfile | null;
  recentDream: Dream | null;
  loading: boolean;
  totalDreams: number;
  topProfile: DreamProfile | null;
  onOpen: (profile: DreamProfile) => void;
  onPeekRoom: (profile: DreamProfile) => void;
  onClose: () => void;
}

/**
 * lg+ 専用の常駐右パネル。
 * 未選択時は「きょうの もり」（既存の ForestTodayCard を流用）を表示し、
 * 木を選ぶと TreePreviewContent に切り替わる。
 * lg未満では hidden クラスで非表示にするだけで、DOM 自体は常にマウントする
 * （MorpheusGuideLogin と同じ既存の出し分けパターンを踏襲）。
 * プロフィールが0件のときは何も描画しない。
 */
export default function TreeSidePanel({
  profiles,
  selectedProfile,
  recentDream,
  loading,
  totalDreams,
  topProfile,
  onOpen,
  onPeekRoom,
  onClose,
}: TreeSidePanelProps) {
  if (profiles.length === 0) return null;

  return (
    <div
      data-testid="tree-side-panel"
      className="hidden lg:flex lg:w-[320px] lg:flex-none lg:self-start lg:flex-col lg:rounded-3xl lg:border lg:border-indigo-400/20 lg:bg-gradient-to-b lg:from-slate-900 lg:via-indigo-950 lg:to-slate-950 lg:p-4 lg:text-white lg:shadow-lg"
    >
      {selectedProfile ? (
        <>
          <button
            onClick={onClose}
            className="mb-3 self-start text-[12.5px] font-bold text-white/60 hover:text-white"
          >
            ‹ えらびなおす
          </button>
          <TreePreviewContent
            profile={selectedProfile}
            recentDream={recentDream}
            loading={loading}
            onOpen={onOpen}
            onPeekRoom={onPeekRoom}
          />
        </>
      ) : (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
          <ForestTodayCard totalDreams={totalDreams} topProfile={topProfile} />
          <p className="text-[13px] text-white/50">きを えらんでね</p>
        </div>
      )}
    </div>
  );
}
