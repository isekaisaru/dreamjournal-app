import Link from "next/link";
import { Sparkles } from "lucide-react";

// backend の上限と一致させる（DreamsController::TRIAL_ANALYSIS_LIMIT / AudioDreamsController::TRIAL_AUDIO_LIMIT）
export const TRIAL_ANALYSIS_LIMIT = 3;
export const TRIAL_AUDIO_LIMIT = 1;

type TrialBannerProps = {
  analysisCount?: number;
  audioCount?: number;
};

/**
 * お試しユーザー向けのホームバナー。
 * 「お試し中」表示・AI分析/音声記録の残回数・本登録CTAをまとめる。
 */
export default function TrialBanner({
  analysisCount = 0,
  audioCount = 0,
}: TrialBannerProps) {
  const analysisRemaining = Math.max(0, TRIAL_ANALYSIS_LIMIT - analysisCount);
  const audioRemaining = Math.max(0, TRIAL_AUDIO_LIMIT - audioCount);

  return (
    <div
      role="region"
      aria-label="お試し中のお知らせ"
      className="mb-4 w-full rounded-2xl border border-primary/30 bg-primary/5 p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
          お試し中
        </span>
        <p className="text-sm font-medium text-foreground">
          いまは たいけんばん だよ
        </p>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
        <span>
          AIぶんせき のこり{" "}
          <span className="font-bold text-foreground">{analysisRemaining}回</span>
        </span>
        <span>
          こえで のこす のこり{" "}
          <span className="font-bold text-foreground">{audioRemaining}回</span>
        </span>
      </div>

      <Link
        href="/register"
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Sparkles size={16} />
        とうろくして ぜんぶ つかう
      </Link>
    </div>
  );
}
