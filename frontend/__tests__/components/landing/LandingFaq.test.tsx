import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import LandingFaq from "@/app/components/landing/LandingFaq";

describe("LandingFaq", () => {
  it("8問すべての質問文を表示する", () => {
    render(<LandingFaq />);
    expect(screen.getByText("YumeTreeは何のアプリですか？")).toBeInTheDocument();
    expect(screen.getByText("AI分析は医療診断ですか？")).toBeInTheDocument();
    expect(screen.getByText("夢の内容は他人に公開されますか？")).toBeInTheDocument();
    expect(screen.getByText("ひとりでも使えますか？")).toBeInTheDocument();
    expect(screen.getByText("家族・恋人・友達とも使えますか？")).toBeInTheDocument();
    expect(screen.getByText("夢の画像生成とは何ですか？")).toBeInTheDocument();
    expect(screen.getByText("無料で試せますか？")).toBeInTheDocument();
    expect(screen.getByText("モルペウスとは何ですか？")).toBeInTheDocument();
  });

  it("質問クリックでaria-expandedが切り替わり回答が表示される", () => {
    render(<LandingFaq />);
    const button = screen.getByText("AI分析は医療診断ですか？").closest("button") as HTMLButtonElement;

    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/医療診断や心理診断ではありません/)).not.toBeInTheDocument();

    fireEvent.click(button);

    const updatedButton = screen.getByText("AI分析は医療診断ですか？").closest("button") as HTMLButtonElement;
    expect(updatedButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/医療診断や心理診断ではありません/)).toBeInTheDocument();
  });
});
