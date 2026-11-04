import React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import ForestScene from "@/app/components/forest/ForestScene";
import type { DreamProfile } from "@/app/types";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// canvas / requestAnimationFrame を使う装飾は、パン操作の検証に関係しないので空にする
jest.mock("@/app/components/forest/ParticleField", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/app/components/forest/Critters", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/app/components/forest/WalkingMorpheus", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/app/components/forest/TreePreviewSheet", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/app/components/forest/MiniTree", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/app/components/forest/ForestTodayCard", () => ({
  __esModule: true,
  default: () => null,
}));

const profile = {
  id: 1,
  name: "テスト",
  avatar_emoji: "🌱",
  color: "#88cc88",
  relationship: "self",
  active: true,
  position: 0,
  archived: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  dreams_count: 3,
} as unknown as DreamProfile;

// 描画中の例外を受け止めて記録する（受け止めなければテストごと落ちて、何が起きたか分かりにくい）
class Boundary extends React.Component<
  { onError: (error: Error) => void; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    return this.state.failed ? (
      <p data-testid="forest-crashed" />
    ) : (
      this.props.children
    );
  }
}

function renderScene() {
  const errors: Error[] = [];
  const utils = render(
    <Boundary onError={(e) => errors.push(e)}>
      <ForestScene
        profiles={[profile]}
        selectedProfileId={null}
        onSelectTree={jest.fn()}
        onCloseSheet={jest.fn()}
        recentDream={null}
        loading={false}
      />
    </Boundary>
  );
  // パン/ズームを受け付けるレイヤー（cursor を style に持つ div）と、その中の transform を持つ世界
  const panLayer = utils.container.querySelector<HTMLElement>(
    'div[style*="cursor"]'
  );
  if (!panLayer) throw new Error("パン用のレイヤーが見つかりません");
  const world = panLayer.firstElementChild as HTMLElement;
  return { ...utils, errors, panLayer, world };
}

const at = (pointerId: number, clientX: number, clientY = 100) => ({
  pointerId,
  clientX,
  clientY,
});

// jsdom には PointerEvent がなく、fireEvent が clientX / pointerId を渡せない。
// MouseEvent（clientX を持つ）に pointerId を足した最小の代用品を、このファイルの中だけで使う。
class TestPointerEvent extends MouseEvent {
  pointerId: number;

  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 0;
  }
}

describe("ForestScene のパン操作（pointer イベント）", () => {
  const originalResizeObserver = global.ResizeObserver;
  const originalPointerEvent = window.PointerEvent;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeAll(() => {
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    window.PointerEvent = TestPointerEvent as unknown as typeof PointerEvent;
  });

  afterAll(() => {
    global.ResizeObserver = originalResizeObserver;
    window.PointerEvent = originalPointerEvent;
  });

  beforeEach(() => {
    // Boundary が受け止めた例外を React が console.error に出すので、出力だけ抑える
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("1イベントずつ描画されるドラッグでは、指の移動量だけ森が動く（試験の土台）", () => {
    const { panLayer, world, errors } = renderScene();
    // jsdom では幅0なので、プロフィール1件の初期位置は -(1180 / 2) = -590px
    expect(world.style.transform).toBe("translate(-590px, 0px) scale(1)");

    fireEvent.pointerDown(panLayer, at(1, 100));
    fireEvent.pointerMove(panLayer, at(1, 70));
    fireEvent.pointerUp(panLayer, at(1, 70));

    expect(errors).toEqual([]);
    expect(world.style.transform).toBe("translate(-620px, 0px) scale(1)");
  });

  it("move の状態更新が描画される前に pointerup が来ても、例外にならない", () => {
    const { panLayer, world, errors } = renderScene();

    // 1つの act にまとめ、move の状態更新が描画される前に pointerup で dragRef を null にする
    act(() => {
      fireEvent.pointerDown(panLayer, at(1, 100));
      fireEvent.pointerMove(panLayer, at(1, 90));
      fireEvent.pointerMove(panLayer, at(1, 70));
      fireEvent.pointerUp(panLayer, at(1, 70));
    });

    expect(errors).toEqual([]);
    expect(world.style.transform).toBe("translate(-620px, 0px) scale(1)");
  });

  it("move が1回だけでも、描画前に pointerup が来て例外にならない", () => {
    const { panLayer, errors } = renderScene();

    act(() => {
      fireEvent.pointerDown(panLayer, at(1, 100));
      fireEvent.pointerMove(panLayer, at(1, 70));
      fireEvent.pointerUp(panLayer, at(1, 70));
    });

    expect(errors).toEqual([]);
  });

  it("ドラッグ中の状態更新が描画される前に2本目の指を置いても（ピンチ開始）、例外にならない", () => {
    const { panLayer, errors } = renderScene();

    act(() => {
      fireEvent.pointerDown(panLayer, at(1, 100));
      fireEvent.pointerMove(panLayer, at(1, 90));
      fireEvent.pointerMove(panLayer, at(1, 70));
      fireEvent.pointerDown(panLayer, at(2, 200));
    });

    expect(errors).toEqual([]);
  });
});
