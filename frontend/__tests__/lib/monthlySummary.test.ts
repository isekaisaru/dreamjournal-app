import { buildMonthlySummary } from "@/lib/monthlySummary";
import type { Dream } from "@/app/types";

// 感情ラベル変換は恒等にして、同率判定ロジックだけを検証する
jest.mock("@/app/components/EmotionTag", () => ({
  getChildFriendlyEmotionLabel: (label: string) => label,
}));

const dreamWith = (tags: string[]): Dream =>
  ({
    id: Math.random(),
    title: "ゆめ",
    content: "ないよう",
    created_at: "2026-06-01T00:00:00Z",
    analysis_status: "done",
    analysis_json: { emotion_tags: tags },
  }) as unknown as Dream;

describe("buildMonthlySummary トップ感情の同率表示", () => {
  it("1位が単独のときは1つだけ表示する", () => {
    const dreams = [
      dreamWith(["うれしい"]),
      dreamWith(["うれしい"]),
      dreamWith(["こわい"]),
    ];
    const summary = buildMonthlySummary(dreams, "6がつ");

    expect(summary.message).toContain("いちばん多かった きもちは「うれしい」だったよ。");
    expect(summary.message).not.toContain("と「");
  });

  it("1位が同率のときは複数を「と」でつなぐ", () => {
    const dreams = [
      dreamWith(["うれしい"]),
      dreamWith(["うれしい"]),
      dreamWith(["こわい"]),
      dreamWith(["こわい"]),
    ];
    const summary = buildMonthlySummary(dreams, "6がつ");

    expect(summary.message).toContain(
      "いちばん多かった きもちは「うれしい」と「こわい」だったよ。"
    );
  });

  it("同率が多すぎるときは3つまで表示し「など」をつける", () => {
    const dreams = [
      dreamWith(["A"]),
      dreamWith(["B"]),
      dreamWith(["C"]),
      dreamWith(["D"]),
    ];
    const summary = buildMonthlySummary(dreams, "6がつ");

    expect(summary.message).toContain("「A」と「B」と「C」など");
  });

  it("感情タグが無いときは案内メッセージを出す", () => {
    const dreams = [dreamWith([]), dreamWith([])];
    const summary = buildMonthlySummary(dreams, "6がつ");

    expect(summary.message).toContain("これから きもちタグが ふえると");
  });
});
