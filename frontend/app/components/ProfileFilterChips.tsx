"use client";

import type { DreamProfile } from "@/app/types";

type ProfileFilterChipsProps = {
  profiles: DreamProfile[];
  selectedProfileId?: string | null;
  onSelect: (profileId: string | null) => void;
};

export default function ProfileFilterChips({
  profiles,
  selectedProfileId,
  onSelect,
}: ProfileFilterChipsProps) {
  const activeProfiles = profiles.filter(
    (profile) => profile.active && !profile.archived
  );
  const isAllSelected = !selectedProfileId;

  if (activeProfiles.length === 0) {
    return null;
  }

  return (
    <section className="mb-4 w-full" aria-label="夢プロフィールで絞り込む">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-foreground">だれの ゆめ？</h2>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
        <button
          type="button"
          aria-pressed={isAllSelected}
          onClick={() => onSelect(null)}
          className={[
            "min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition-colors",
            isAllSelected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:bg-muted",
          ].join(" ")}
        >
          すべて
        </button>
        {activeProfiles.map((profile) => {
          const isSelected = selectedProfileId === String(profile.id);
          const selectedStyle = isSelected
            ? {
                borderColor: profile.color,
                backgroundColor: `${profile.color}1A`,
                color: profile.color,
              }
            : undefined;

          return (
            <button
              key={profile.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(String(profile.id))}
              style={selectedStyle}
              className={[
                "inline-flex min-h-11 max-w-52 shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-colors",
                isSelected
                  ? "bg-card"
                  : "border-border bg-card text-muted-foreground hover:bg-muted",
              ].join(" ")}
            >
              <span aria-hidden="true">{profile.avatar_emoji}</span>
              <span className="truncate">{profile.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
