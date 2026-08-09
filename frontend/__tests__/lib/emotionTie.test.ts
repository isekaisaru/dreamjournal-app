import { pickTopEmotionLabels, formatTopEmotionLabels } from "@/lib/emotionTie";

describe("pickTopEmotionLabels", () => {
  it("単独1位なら1つだけ返す", () => {
    expect(pickTopEmotionLabels({ うれしい: 3, こわい: 1 })).toEqual([
      "うれしい",
    ]);
  });

  it("同率1位はすべて返す", () => {
    expect(pickTopEmotionLabels({ うれしい: 2, こわい: 2, かなしい: 1 })).toEqual([
      "うれしい",
      "こわい",
    ]);
  });

  it("感情が無いときは空配列を返す", () => {
    expect(pickTopEmotionLabels({})).toEqual([]);
  });
});

describe("formatTopEmotionLabels", () => {
  it("1つは「A」だけ", () => {
    expect(formatTopEmotionLabels(["うれしい"])).toBe("「うれしい」");
  });

  it("2つは「A」と「B」でつなぐ", () => {
    expect(formatTopEmotionLabels(["うれしい", "こわい"])).toBe(
      "「うれしい」と「こわい」"
    );
  });

  it("3つを超えると3つまで＋「など」", () => {
    expect(formatTopEmotionLabels(["A", "B", "C", "D"])).toBe(
      "「A」と「B」と「C」など"
    );
  });

  it("空配列は空文字", () => {
    expect(formatTopEmotionLabels([])).toBe("");
  });
});
