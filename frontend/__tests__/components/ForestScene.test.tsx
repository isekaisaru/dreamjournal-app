import { getInitialForestView } from "@/app/components/forest/ForestScene";

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
