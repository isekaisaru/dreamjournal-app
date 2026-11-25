import React from "react";
import { act, render, screen } from "@testing-library/react";
import Loading from "@/app/loading";

// ホームなどは、ログインの確認が終わるまでこの画面を出す。
// サーバーが寝ていると確認に時間がかかり、つながらないときは何の案内もなく回り続けていた（2026-11-25）。
describe("よみこみ中の画面", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("はじめは、よみこみ中の表示だけを出す", () => {
    render(<Loading />);

    expect(screen.getByRole("status")).toHaveTextContent("よみこんでいるよ");
    expect(
      screen.queryByRole("button", { name: "もういちど よみこむ" })
    ).not.toBeInTheDocument();
  });

  it("時間がかかったら、待っている理由と、よみこみなおすボタンを出す", () => {
    render(<Loading />);

    act(() => {
      jest.advanceTimersByTime(10_000);
    });

    expect(screen.getByText(/サーバーを おこしている/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "もういちど よみこむ" })
    ).toBeInTheDocument();
  });
});
