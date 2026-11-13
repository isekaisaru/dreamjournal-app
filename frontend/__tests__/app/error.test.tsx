import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as Sentry from "@sentry/nextjs";
import ErrorComponent from "@/app/error";

jest.mock("@sentry/nextjs", () => ({
  captureException: jest.fn(),
}));

describe("app/error.tsx", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("受け取った例外を Sentry に送る", () => {
    const error = new Error("forest render failed");

    render(<ErrorComponent error={error} reset={jest.fn()} />);

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });

  it("再レンダリングしても同じ例外を二重送信しない", () => {
    const error = new Error("forest render failed");
    const reset = jest.fn();

    const { rerender } = render(<ErrorComponent error={error} reset={reset} />);
    rerender(<ErrorComponent error={error} reset={reset} />);

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it("既存の表示と操作を保つ", async () => {
    const reset = jest.fn();

    render(<ErrorComponent error={new Error("x")} reset={reset} />);

    expect(screen.getByText("うまく ひらけなかったよ")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "おうちへ" })).toHaveAttribute(
      "href",
      "/home"
    );

    await userEvent.click(screen.getByRole("button", { name: "もういちど" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
