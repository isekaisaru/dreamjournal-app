import React from "react";
import { act, render, screen } from "@testing-library/react";
import StreamingAnalysis from "@/app/components/StreamingAnalysis";

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({
    alt,
    fill,
    priority,
    unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
    unoptimized?: boolean;
  }) => <img alt={alt} {...props} />,
}));

describe("StreamingAnalysis", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.localStorage.clear();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("types saved analysis text and then shows emotion tags", () => {
    render(
      <StreamingAnalysis
        title="🔮 モルペウスの ゆめうらない"
        text="楽しい気持ちが強い夢です"
        emotions={["楽しい"]}
        storageKey="dream-1"
      />
    );

    expect(screen.getByText("生成中")).toBeTruthy();
    expect(screen.queryByText("楽しい")).toBeNull();

    act(() => {
      jest.runAllTimers();
    });

    expect(screen.getByText("楽しい気持ちが強い夢です")).toBeTruthy();
    expect(screen.getByText("😆 たのしい")).toBeTruthy();
    expect(window.localStorage.getItem("yumetree:streaming-analysis:dream-1")).toBe(
      "1"
    );
  });

  it("shows the full text immediately after the dream was seen once", () => {
    window.localStorage.setItem("yumetree:streaming-analysis:dream-2", "1");

    render(
      <StreamingAnalysis
        title="🔮 モルペウスの ゆめうらない"
        text="二回目はすぐ読める"
        storageKey="dream-2"
      />
    );

    expect(screen.queryByText("生成中")).toBeNull();
    expect(screen.getByText("二回目はすぐ読める")).toBeTruthy();
  });
});
