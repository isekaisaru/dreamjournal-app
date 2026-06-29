import { Dream } from "@/app/types";

/**
 * 夢から「感情ラベル名の配列」を取り出す。
 *
 * AI分析タグ（`analysis_json.emotion_tags`）を優先するが、**空配列のときは**
 * 手動で付けた `emotions` にフォールバックする。
 *
 * 注意: `a ?? b` は `null`/`undefined` のときしか b に倒れないため、
 * AIが空配列 `[]` を返したケースでは手動タグが無視されてしまう。
 * そのため長さチェックで判定する（夢詳細の表示ロジックと同じ方針）。
 */
export function resolveDreamEmotionNames(dream: Dream): string[] {
  const aiTags = dream.analysis_json?.emotion_tags;
  if (aiTags && aiTags.length > 0) return aiTags;
  return dream.emotions?.map((e) => e.name) ?? [];
}
