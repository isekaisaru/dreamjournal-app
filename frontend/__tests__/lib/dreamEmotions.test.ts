import { resolveDreamEmotionNames } from "@/lib/dreamEmotions";
import { Dream } from "@/app/types";

function makeDream(partial: Partial<Dream>): Dream {
  return { id: 1, created_at: "2026-06-15T00:00:00Z", ...partial } as Dream;
}

describe("resolveDreamEmotionNames", () => {
  it("AIタグがあればAIタグを使う", () => {
    const dream = makeDream({
      analysis_json: { emotion_tags: ["嬉しい", "楽しい"] } as Dream["analysis_json"],
      emotions: [{ id: 1, name: "怒り" }] as Dream["emotions"],
    });
    expect(resolveDreamEmotionNames(dream)).toEqual(["嬉しい", "楽しい"]);
  });

  it("AIタグが空配列なら手動emotionsにフォールバックする（バグ回帰防止）", () => {
    const dream = makeDream({
      analysis_json: { emotion_tags: [] } as Dream["analysis_json"],
      emotions: [{ id: 1, name: "怒り" }] as Dream["emotions"],
    });
    expect(resolveDreamEmotionNames(dream)).toEqual(["怒り"]);
  });

  it("AIタグが無く(undefined)ても手動emotionsを使う", () => {
    const dream = makeDream({
      emotions: [{ id: 1, name: "かなしい" }] as Dream["emotions"],
    });
    expect(resolveDreamEmotionNames(dream)).toEqual(["かなしい"]);
  });

  it("どちらも無ければ空配列", () => {
    expect(resolveDreamEmotionNames(makeDream({}))).toEqual([]);
  });
});
