import {
  getGrowthLevel,
  getCanopyScale,
  fruitPosition,
  fruitColor,
  RECENT_FRUIT_COUNT,
} from "../../lib/forest";

describe("getGrowthLevel", () => {
  it.each([
    [0, 0],
    [1, 1],
    [4, 1],
    [5, 2],
    [14, 2],
    [15, 3],
    [29, 3],
    [30, 4],
    [59, 4],
    [60, 5],
    [999, 5],
  ])("夢 %i 件 → レベル %i", (count, level) => {
    expect(getGrowthLevel(count).level).toBe(level);
  });

  it("各レベルに名前と絵文字がある", () => {
    expect(getGrowthLevel(10).name).toBeTruthy();
    expect(getGrowthLevel(10).emoji).toBeTruthy();
  });
});

describe("getCanopyScale", () => {
  it("レベルが上がるほど大きく、単調増加する", () => {
    const scales = [0, 1, 2, 3, 4, 5].map(getCanopyScale);
    for (let i = 1; i < scales.length; i++) {
      expect(scales[i]).toBeGreaterThanOrEqual(scales[i - 1]);
    }
  });
});

describe("fruitPosition", () => {
  it("同じ dreamId なら毎回同じ座標（決定的）", () => {
    const a = fruitPosition(42, 0);
    const b = fruitPosition(42, 0);
    expect(a).toEqual(b);
  });

  it("座標は 0〜100 の % に収まる", () => {
    for (let id = 1; id <= 20; id++) {
      const p = fruitPosition(id, id % RECENT_FRUIT_COUNT);
      expect(p.xPct).toBeGreaterThanOrEqual(0);
      expect(p.xPct).toBeLessThanOrEqual(100);
      expect(p.yPct).toBeGreaterThanOrEqual(0);
      expect(p.yPct).toBeLessThanOrEqual(100);
    }
  });
});

describe("fruitColor", () => {
  it("感情があればその色、なければプロフィール色にフォールバック", () => {
    const withEmotion = fruitColor(
      { id: 1, emotions: [{ id: 1, name: "喜び" }] } as any,
      "#6366f1"
    );
    const withoutEmotion = fruitColor({ id: 2, emotions: [] } as any, "#6366f1");
    expect(withEmotion).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(withoutEmotion).toBe("#6366f1");
  });
});
