"use client";

import { Dream, DreamProfile } from "@/app/types";
import { getChildFriendlyEmotionLabel } from "./EmotionTag";
import { resolveDreamEmotionNames } from "@/lib/dreamEmotions";
import { pickTopEmotionLabels, formatTopEmotionLabels } from "@/lib/emotionTie";

interface WeeklyDreamNewsWidgetProps {
  dreams: Dream[];
  profiles: DreamProfile[];
}

interface ProfileWeeklySummary {
  profile: DreamProfile;
  count: number;
  latestTitle: string | null;
  topEmotionLabel: string;
}

/**
 * 直近7日間の夢をプロフィールごとに要約する「今週のゆめニュース」ウィジェット。
 * ホームページのサイドバーに配置。新規API呼び出しは行わず、
 * home/page.tsxが既に取得済みのdreams/profilesをそのまま集計する。
 */
export default function WeeklyDreamNewsWidget({
  dreams,
  profiles,
}: WeeklyDreamNewsWidgetProps) {
  const activeProfiles = profiles.filter((p) => !p.archived);
  if (activeProfiles.length === 0) return null;

  // DreamStatsWidget.tsxの7日ウィンドウ判定と同期が必要
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekDreams = dreams.filter((d) => new Date(d.created_at) >= weekAgo);

  const summaries: ProfileWeeklySummary[] = activeProfiles.map((profile) => {
    const profileDreams = weekDreams
      .filter((d) => d.dream_profile_id === profile.id)
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

    const latestDream = profileDreams[0] ?? null;
    const latestTitle = latestDream
      ? latestDream.title?.trim() || "タイトルのない夢"
      : null;

    const emotionCounts: Record<string, number> = {};
    profileDreams.forEach((dream) => {
      resolveDreamEmotionNames(dream).forEach((tag) => {
        const label = getChildFriendlyEmotionLabel(tag);
        emotionCounts[label] = (emotionCounts[label] ?? 0) + 1;
      });
    });

    return {
      profile,
      count: profileDreams.length,
      latestTitle,
      topEmotionLabel: formatTopEmotionLabels(pickTopEmotionLabels(emotionCounts)),
    };
  });

  const withDreams = summaries.filter((s) => s.count > 0);
  const withoutDreams = summaries.filter((s) => s.count === 0);

  const subtitle =
    activeProfiles.length === 1
      ? "今週はこんな夢を見たよ"
      : "みんなの今週の夢を見てみよう";

  if (withDreams.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 w-full mb-4">
        <h3 className="font-bold text-card-foreground mb-1 flex items-center gap-2">
          <span aria-hidden="true">📰</span>
          <span>今週のゆめニュース</span>
        </h3>
        <p className="text-xs text-muted-foreground">今週はまだ夢の記録がないよ。</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 w-full mb-4">
      <h3 className="font-bold text-card-foreground mb-1 flex items-center gap-2">
        <span aria-hidden="true">📰</span>
        <span>今週のゆめニュース</span>
      </h3>
      <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>

      <div className="space-y-3">
        {withDreams.map(({ profile, count, latestTitle, topEmotionLabel }) => (
          <div key={profile.id} className="flex items-start gap-2">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
              style={{ backgroundColor: `${profile.color}33` }}
              aria-hidden="true"
            >
              {profile.avatar_emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-card-foreground truncate">
                {profile.name}：{count}つの夢を記録
              </p>
              {latestTitle && (
                <p className="text-xs text-muted-foreground truncate">「{latestTitle}」</p>
              )}
              {topEmotionLabel && (
                <p className="text-xs text-muted-foreground">
                  いちばん多かった きもち：{topEmotionLabel}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {withoutDreams.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          今週まだ記録がないプロフィールにも、また夢を見たら教えてね。
        </p>
      )}
    </div>
  );
}
