import React from "react";
import { render, screen } from "@testing-library/react";
import TrialBanner, {
  TRIAL_ANALYSIS_LIMIT,
  TRIAL_AUDIO_LIMIT,
} from "@/app/components/TrialBanner";

describe("TrialBanner", () => {
  it("お試し中バッジと本登録CTAを表示する", () => {
    render(<TrialBanner analysisCount={0} audioCount={0} />);

    expect(screen.getByText("お試し中")).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /とうろくして/ });
    expect(cta).toHaveAttribute("href", "/register");
  });

  it("使用回数から残回数を計算して表示する", () => {
    render(<TrialBanner analysisCount={1} audioCount={0} />);

    // AI分析: 3 - 1 = 2回
    expect(screen.getByText(`${TRIAL_ANALYSIS_LIMIT - 1}回`)).toBeInTheDocument();
    // 音声: 1 - 0 = 1回
    expect(screen.getByText(`${TRIAL_AUDIO_LIMIT}回`)).toBeInTheDocument();
  });

  it("上限を超えても残回数は0で止まる（負数にしない）", () => {
    render(<TrialBanner analysisCount={5} audioCount={3} />);

    // 残り0回が2箇所（AI分析・音声）
    expect(screen.getAllByText("0回")).toHaveLength(2);
  });

  it("カウント未指定でも上限値を残回数として表示する", () => {
    render(<TrialBanner />);

    expect(screen.getByText(`${TRIAL_ANALYSIS_LIMIT}回`)).toBeInTheDocument();
    expect(screen.getByText(`${TRIAL_AUDIO_LIMIT}回`)).toBeInTheDocument();
  });
});
