import { render, screen } from "@testing-library/react";
import InsightsPage, { computeStreak } from "@/app/insights/page";
import type { Dream } from "@/app/types";

const mockUseAuth = jest.fn();
jest.mock("@/context/AuthContext", () => ({
  __esModule: true,
  useAuth: () => mockUseAuth(),
}));

const mockGet = jest.fn<(...args: unknown[]) => Promise<Dream[]>>();
jest.mock("@/lib/apiClient", () => ({
  __esModule: true,
  default: { get: (...args: unknown[]) => mockGet(...args) },
}));

function dream(id: number, isoDate: string, emotion: string): Dream {
  return {
    id,
    created_at: isoDate,
    analysis_json: { emotion_tags: [emotion] },
  } as unknown as Dream;
}

beforeEach(() => {
  mockUseAuth.mockReturnValue({ authStatus: "authenticated", user: { premium: false } });
  mockGet.mockResolvedValue([]);
});

describe("computeStreak", () => {
  it("今日の記録があれば1日以上", () => {
    expect(computeStreak([dream(1, new Date().toISOString(), "嬉しい")])).toBeGreaterThanOrEqual(1);
  });

  it("記録ゼロなら0", () => {
    expect(computeStreak([])).toBe(0);
  });

  it("10日前の記録だけなら0（連続が途切れている）", () => {
    const old = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(computeStreak([dream(1, old, "嬉しい")])).toBe(0);
  });
});

describe("InsightsPage", () => {
  it("未ログインではログイン要求を表示する", () => {
    mockUseAuth.mockReturnValue({ authStatus: "unauthenticated", user: null });
    render(<InsightsPage />);
    expect(
      screen.getByText("きもちインサイトを見るにはログインが必要だよ")
    ).toBeInTheDocument();
  });

  it("ログイン時にダッシュボード（KPI/カレンダー/TOP5）を描画する", async () => {
    mockGet.mockResolvedValue([
      dream(1, new Date().toISOString(), "嬉しい"),
    ]);
    render(<InsightsPage />);
    expect(await screen.findByText("きもちインサイト")).toBeInTheDocument();
    expect(screen.getByText("今月の記録")).toBeInTheDocument();
    expect(screen.getByText("連続記録")).toBeInTheDocument();
    expect(screen.getByText("きもち TOP5")).toBeInTheDocument();
    expect(screen.getByText("ムードカレンダー")).toBeInTheDocument();
    expect(screen.getByText("記録の流れ（半年）")).toBeInTheDocument();
  });

  // 家族のプロフィールの夢もまとめて数えている。子どもだけの傾向だと読みちがえないように書く。
  // また「%」は夢の数ではなく、気持ちのタグの数で割っている（2026-11-25）。
  it("家族みんなの夢を合わせて数えていることと、% が何の割合かを書く", async () => {
    mockGet.mockResolvedValue([
      dream(1, new Date().toISOString(), "嬉しい"),
    ]);
    render(<InsightsPage />);

    expect(
      await screen.findByText("この アカウントの みんなの ゆめを あわせて かぞえているよ")
    ).toBeInTheDocument();
    expect(screen.getByText("前向きな きもちの わりあい")).toBeInTheDocument();
    // 分母（つけた気持ちタグぜんぶ）を、コードのコメントだけでなく画面にも書く（Codex レビュー指摘）
    expect(
      screen.getByText("％は、つけた きもちタグ ぜんぶを 100％として かぞえているよ")
    ).toBeInTheDocument();
    expect(screen.queryByText(/前向きな夢/)).not.toBeInTheDocument();
  });
});
