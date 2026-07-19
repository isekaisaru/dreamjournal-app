import React from "react";
import { render, screen } from "@testing-library/react";
import LandingHero from "@/app/components/landing/LandingHero";

describe("LandingHero", () => {
  it("h1にサイト名とキャッチコピーを表示する", () => {
    render(<LandingHero />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("YumeTree");
    expect(heading).toHaveTextContent("モルペウスと育てるAI夢ノート");
  });

  it("主CTAが/trialを指す", () => {
    render(<LandingHero />);
    const cta = screen.getByRole("link", { name: /今朝の夢を入れてみる/ });
    expect(cta).toHaveAttribute("href", "/trial");
  });

  it("独自のnav要素を持たない（グローバルHeaderとの重複防止）", () => {
    const { container } = render(<LandingHero />);
    expect(container.querySelector("nav")).toBeNull();
  });

  it("未検証の統計数値を表示しない", () => {
    render(<LandingHero />);
    expect(screen.queryByText(/50,000/)).not.toBeInTheDocument();
    expect(screen.queryByText(/4\.8/)).not.toBeInTheDocument();
  });
});
