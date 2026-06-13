"use client";

import { useState } from "react";
import type { DreamProfile } from "@/app/types";
import { getGrowthLevel, getCanopyScale } from "@/lib/forest";
import ForestTree from "./ForestTree";

interface MiniTreeProps {
  profile: DreamProfile;
  isSelected?: boolean;
  onSelect?: () => void;
  height?: number;
}

/**
 * 森の一覧画面に並ぶ木。
 * - 選択中 / ホバー中は光のリング + ラベル強調
 * - ラベルは 2 行: 「🌙 そら」 / 「若木｜ゆめ 14こ」
 * - CSS keyframe sway（forest-sway）で軽く揺れる（JS rAF なし）
 *
 * 注: 一覧APIは各プロフィールの夢本体（dreams）を返さないため、
 *     一覧の木には実を出さない（showFruits=false）。実は詳細画面で表示する。
 */
export default function MiniTree({ profile, isSelected = false, onSelect, height }: MiniTreeProps) {
  const [hovered, setHovered] = useState(false);
  const count = profile.dreams_count ?? 0;
  const lvl = getGrowthLevel(count);
  const treeH = height ?? Math.round((120 + lvl.level * 22) * getCanopyScale(lvl.level) * 0.9 + 80);
  const active = isSelected || hovered;

  return (
    <div
      className={`forest-tree-group${active ? " selected" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      {/* selection / hover ring */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: Math.round(treeH * 0.12),
          left: "50%",
          transform: "translateX(-50%)",
          width: Math.round(treeH * 0.62),
          height: Math.round(treeH * 0.62),
          borderRadius: "50%",
          boxShadow: `0 0 0 3px ${profile.color}cc, 0 0 26px 6px ${profile.color}66`,
          opacity: active ? 1 : 0,
          transition: "opacity .18s",
          pointerEvents: "none",
          zIndex: 4,
        }}
      />

      {/* the lush SVG tree */}
      <ForestTree
        profile={profile}
        dreams={[]}
        level={lvl.level}
        height={treeH}
        variant="mini"
        usePhysics={false}
        showFruits={false}
        onTapTree={onSelect}
      />

      {/* label */}
      <button
        type="button"
        onClick={onSelect}
        aria-label={`${profile.name}の き。${lvl.name}、ゆめ ${count}こ。タップで くわしく見る`}
        className="forest-tree-btn mt-[-4px] flex flex-col items-center gap-0.5 rounded-[14px] px-3 py-1.5 backdrop-blur-md transition-all"
        style={{
          background: active ? "rgba(18,18,46,0.92)" : "rgba(10,11,30,0.78)",
          border: `1.5px solid ${active ? profile.color : profile.color + "55"}`,
          boxShadow: active ? `0 6px 18px ${profile.color}44` : "0 4px 12px rgba(6,4,20,0.4)",
          cursor: "pointer",
          whiteSpace: "nowrap",
          color: "#fff",
        }}
      >
        <span style={{ fontWeight: 800, fontSize: 14.5 }}>{profile.avatar_emoji} {profile.name}</span>
        <span style={{ fontSize: 11.5, color: "#aeb8d6", fontWeight: 600 }}>
          <span style={{ color: profile.color, fontWeight: 800 }}>{lvl.name}</span>
          ｜ゆめ {count}こ
        </span>
      </button>
    </div>
  );
}
