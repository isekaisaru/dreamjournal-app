import {
  clampForestView,
  getInitialForestView,
  getSafePinchZoom,
} from "@/app/components/forest/ForestScene";

describe("getInitialForestView", () => {
  it("プロフィール1件で森が画面より広い場合、木が初期表示の中央に入る位置へ寄せる", () => {
    expect(getInitialForestView(1, 1180, 360)).toEqual({ x: -410, y: 0, z: 1 });
  });

  it("プロフィール1件でもPC幅では既存の左端開始を維持する", () => {
    expect(getInitialForestView(1, 1180, 960)).toEqual({ x: 0, y: 0, z: 1 });
    expect(getInitialForestView(1, 960, 960)).toEqual({ x: 0, y: 0, z: 1 });
  });

  it("複数プロフィールでは既存表示を大きく変えない", () => {
    expect(getInitialForestView(2, 1180, 360)).toEqual({ x: 0, y: 0, z: 1 });
    expect(getInitialForestView(4, 1180, 360)).toEqual({ x: 0, y: 0, z: 1 });
  });
});

describe("clampForestView", () => {
  it("NaN や Infinity が来ても安全な view に戻す", () => {
    expect(clampForestView({ x: Number.NaN, y: Infinity, z: -Infinity }, 1180, 360, 560)).toEqual({
      x: 0,
      y: 0,
      z: 1,
    });
  });

  it("通常の view は既存の範囲制限を維持する", () => {
    expect(clampForestView({ x: 100, y: 100, z: 3 }, 1180, 960, 560)).toEqual({
      x: 40,
      y: 60,
      z: 2.2,
    });
  });
});

describe("getSafePinchZoom", () => {
  it("ピンチ開始距離が 0 の場合はズーム計算をスキップする", () => {
    expect(getSafePinchZoom(1, 120, 0)).toBeNull();
  });

  it("NaN や Infinity が混ざる場合はズーム計算をスキップする", () => {
    expect(getSafePinchZoom(1, Number.NaN, 120)).toBeNull();
    expect(getSafePinchZoom(1, 120, Infinity)).toBeNull();
    expect(getSafePinchZoom(Number.NaN, 120, 100)).toBeNull();
  });

  it("正常なピンチ距離では次のズーム値を返す", () => {
    expect(getSafePinchZoom(1, 150, 100)).toBe(1.5);
  });
});
