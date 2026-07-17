import React from "react";
import { render, screen } from "@testing-library/react";
import AuthVisualPanel from "@/app/components/AuthVisualPanel";

jest.mock("@/app/components/MorpheusImage", () => ({
  __esModule: true,
  default: ({ variant }: { variant: string }) => (
    <div data-testid="morpheus-image" data-variant={variant} />
  ),
}));

describe("AuthVisualPanel", () => {
  it("login variant では専用メッセージを表示する", () => {
    render(<AuthVisualPanel variant="login" />);
    expect(
      screen.getByText(/また来てくれたんだね/)
    ).toBeInTheDocument();
  });

  it("register variant では専用メッセージを表示する", () => {
    render(<AuthVisualPanel variant="register" />);
    expect(screen.getByText(/はじめまして/)).toBeInTheDocument();
  });

  it("lg未満では非表示になるクラスを持つ（hidden lg:flex）", () => {
    const { container } = render(<AuthVisualPanel variant="login" />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toEqual(expect.stringContaining("hidden"));
    expect(root.className).toEqual(expect.stringContaining("lg:flex"));
  });

  it("純粋装飾のため aria-hidden を持つ", () => {
    const { container } = render(<AuthVisualPanel variant="login" />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveAttribute("aria-hidden", "true");
  });

  it("未検証の利用者数統計やGoogleログインボタンを含まない", () => {
    render(<AuthVisualPanel variant="login" />);
    expect(screen.queryByText(/50,000/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Google/i })
    ).not.toBeInTheDocument();
  });
});
