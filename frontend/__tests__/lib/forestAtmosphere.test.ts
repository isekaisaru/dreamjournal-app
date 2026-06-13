import {
  getTimePhase,
  getSeason,
  getSkyGradient,
  getCelestial,
  type TimePhase,
} from "../../lib/forestAtmosphere";

// 指定した「時」のDateを作る（年月日は固定）
const at = (hour: number) => new Date(2026, 5, 13, hour, 0, 0);
// 指定した「月(1-12)」のDateを作る
const inMonth = (month: number) => new Date(2026, month - 1, 15, 12, 0, 0);

describe("getTimePhase", () => {
  it.each<[number, TimePhase]>([
    [4, "night"],
    [5, "dawn"],
    [9, "dawn"],
    [10, "day"],
    [15, "day"],
    [16, "dusk"],
    [18, "dusk"],
    [19, "night"],
    [23, "night"],
    [0, "night"],
  ])("%i時 → %s", (hour, phase) => {
    expect(getTimePhase(at(hour))).toBe(phase);
  });
});

describe("getSeason", () => {
  it.each<[number, string]>([
    [2, "winter"],
    [3, "spring"],
    [5, "spring"],
    [6, "summer"],
    [8, "summer"],
    [9, "autumn"],
    [11, "autumn"],
    [12, "winter"],
    [1, "winter"],
  ])("%i月 → %s", (month, season) => {
    expect(getSeason(inMonth(month))).toBe(season);
  });
});

describe("getSkyGradient", () => {
  const phases: TimePhase[] = ["dawn", "day", "dusk", "night"];

  it("各phaseで非空文字列を返す", () => {
    phases.forEach((p) => {
      expect(getSkyGradient(p)).toMatch(/gradient/);
    });
  });

  it("4つのphaseはすべて異なる", () => {
    const grads = phases.map(getSkyGradient);
    expect(new Set(grads).size).toBe(4);
  });
});

describe("getCelestial", () => {
  it("同じphaseなら同じ値を返す（決定論）", () => {
    expect(getCelestial("night")).toEqual(getCelestial("night"));
  });

  it("夜は昼より星が濃い", () => {
    expect(getCelestial("night").starOpacity).toBeGreaterThan(
      getCelestial("day").starOpacity
    );
  });

  it("月の位置は0〜100%の範囲内", () => {
    (["dawn", "day", "dusk", "night"] as TimePhase[]).forEach((p) => {
      const c = getCelestial(p);
      expect(c.moonXPct).toBeGreaterThanOrEqual(0);
      expect(c.moonXPct).toBeLessThanOrEqual(100);
      expect(c.moonYPct).toBeGreaterThanOrEqual(0);
      expect(c.moonYPct).toBeLessThanOrEqual(100);
    });
  });
});
