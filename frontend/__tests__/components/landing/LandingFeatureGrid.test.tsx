import React from "react";
import { render, screen } from "@testing-library/react";
import LandingFeatureGrid from "@/app/components/landing/LandingFeatureGrid";

describe("LandingFeatureGrid", () => {
  it("5つの機能見出しを表示する", () => {
    render(<LandingFeatureGrid />);
    expect(screen.getByText("すぐ残せる")).toBeInTheDocument();
    expect(screen.getByText("意味が返る")).toBeInTheDocument();
    expect(screen.getByText("感情の可視化")).toBeInTheDocument();
    expect(screen.getByText("夢を画像に")).toBeInTheDocument();
    expect(screen.getByText("夢の森が育つ")).toBeInTheDocument();
  });

  it("プライバシー強調カードを表示する", () => {
    render(<LandingFeatureGrid />);
    expect(screen.getByText("完全プライベート")).toBeInTheDocument();
  });

  it("未検証の統計数値を表示しない", () => {
    render(<LandingFeatureGrid />);
    expect(screen.queryByText(/50,000/)).not.toBeInTheDocument();
    expect(screen.queryByText(/4\.8/)).not.toBeInTheDocument();
  });
});
