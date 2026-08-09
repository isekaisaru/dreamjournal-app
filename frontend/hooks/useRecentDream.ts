import { useEffect, useState } from "react";
import type { Dream } from "@/app/types";
import { getDreamsForProfile } from "@/lib/apiClient";

function normalizeRecentDreamsResponse(value: unknown): Dream[] {
  if (Array.isArray(value)) return value as Dream[];

  console.error("Unexpected dreams response for tree preview sheet", value);
  return [];
}

/**
 * 選択中プロフィールの直近の夢を1件取得する。
 * プロフィールが切り替わったら、古い応答が新しい選択を上書きしないよう破棄する。
 */
export function useRecentDream(profileId: number | null): {
  recentDream: Dream | null;
  loading: boolean;
} {
  const [recentDream, setRecentDream] = useState<Dream | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profileId === null) {
      setRecentDream(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setRecentDream(null);
    getDreamsForProfile(profileId)
      .then((dreams) => {
        if (!cancelled) setRecentDream(normalizeRecentDreamsResponse(dreams)[0] ?? null);
      })
      .catch(() => {
        /* silently ignore — panel/sheet is still useful without a recent dream */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  return { recentDream, loading };
}
