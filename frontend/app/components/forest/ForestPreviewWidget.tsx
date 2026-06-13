"use client";

import Link from "next/link";
import { Trees } from "lucide-react";
import type { DreamProfile } from "@/app/types";
import { getGrowthLevel, getCanopyScale } from "@/lib/forest";

export default function ForestPreviewWidget({ profiles }: { profiles: DreamProfile[] }) {
  const active = profiles.filter((p) => !p.archived);
  if (active.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 w-full mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-card-foreground flex items-center gap-2 text-sm">
          <Trees className="h-4 w-4 text-primary" aria-hidden="true" />
          ゆめの もり
        </h3>
        <Link
          href="/forest"
          className="text-xs text-primary font-semibold hover:underline"
        >
          もりを みる →
        </Link>
      </div>
      <div className="flex items-end justify-center gap-4 py-1">
        {active.slice(0, 4).map((p) => {
          const count = p.dreams_count ?? 0;
          const { level } = getGrowthLevel(count);
          const scale = getCanopyScale(level);
          const canopySize = Math.round(44 * scale);
          return (
            <Link
              key={p.id}
              href={`/forest/${p.id}`}
              className="flex flex-col items-center group"
              aria-label={`${p.name}の木（夢${count}件）`}
            >
              <div
                className="rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                style={{
                  width: canopySize,
                  height: canopySize,
                  background: `radial-gradient(circle at 40% 35%, ${p.color}cc, ${p.color}55 70%, transparent)`,
                  boxShadow: `0 0 14px ${p.color}44`,
                }}
              >
                <span className="text-sm" aria-hidden="true">{p.avatar_emoji}</span>
              </div>
              <div
                className="bg-[#6b4a2b]"
                style={{ width: 4, height: Math.round(10 + level * 2), borderRadius: "0 0 2px 2px" }}
              />
              <span className="text-[10px] text-muted-foreground mt-0.5 max-w-[48px] truncate text-center block">
                {p.name}
              </span>
            </Link>
          );
        })}
        {active.length > 4 && (
          <span className="text-xs text-muted-foreground self-center">
            +{active.length - 4}
          </span>
        )}
      </div>
    </div>
  );
}
