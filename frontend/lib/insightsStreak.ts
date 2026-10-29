import type { Dream } from "@/app/types";

/** JST基準の連続記録日数 */
export function computeStreak(dreams: Dream[]): number {
  const days = new Set(
    dreams
      .filter((d) => d.created_at)
      .map((d) =>
        new Date(d.created_at).toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" })
      )
  );
  let streak = 0;
  const cur = new Date();
  for (;;) {
    const key = cur.toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
    if (days.has(key)) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    } else {
      // 今日まだ未記録でも、昨日まで続いていれば継続とみなす
      if (streak === 0) {
        cur.setDate(cur.getDate() - 1);
        const k2 = cur.toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
        if (days.has(k2)) continue;
      }
      break;
    }
  }
  return streak;
}
