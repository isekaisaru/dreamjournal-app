"use client";

import type { DreamProfile } from "@/app/types";

interface ForestTodayCardProps {
  totalDreams: number;
  /** Consecutive days logged — pass undefined to hide the row if not available from API yet */
  streak?: number;
  topProfile?: DreamProfile | null;
}

/**
 * Compact "きょうの もり" dashboard card shown in the overview's top-right.
 * Replaces the three separate HUD pills and gives a Duolingo-style progress feel.
 *
 * データ要件:
 *  - totalDreams: profiles.reduce((s, p) => s + (p.dreams_count ?? 0), 0)
 *  - streak:      バックエンドの連続記録エンドポイントが必要（未実装なら省略可）
 *  - topProfile:  profiles.reduce で dreams_count が最大のプロフィール
 */
export default function ForestTodayCard({ totalDreams, streak, topProfile }: ForestTodayCardProps) {
  return (
    <div className="w-48 rounded-[18px] border border-white/20 bg-[rgba(12,12,32,0.72)] p-3 text-white/90 shadow-[0_10px_28px_rgba(6,4,20,0.4)] backdrop-blur-lg">
      {/* header */}
      <div className="mb-2.5 flex items-center gap-1.5">
        <span className="text-sm">🌳</span>
        <span className="text-[13px] font-black text-white">きょうの もり</span>
      </div>

      <div className="flex flex-col gap-1.5">
        {/* streak row — hidden if not provided */}
        {streak != null && (
          <Row icon="🔥">
            <b className="text-amber-400">{streak}にち</b> れんぞく きろく
          </Row>
        )}

        {/* total dreams */}
        <Row icon="🌙">
          ぜんぶで <b className="text-sky-300">{totalDreams}この</b> ゆめ
        </Row>

        {/* top tree */}
        {topProfile && (
          <Row icon="🌟">
            いちばん そだった：
            <b style={{ color: topProfile.color }}>{topProfile.name}</b>
          </Row>
        )}
      </div>
    </div>
  );
}

function Row({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <span className="w-[18px] text-center text-[15px]">{icon}</span>
      <span className="text-white/80">{children}</span>
    </div>
  );
}
