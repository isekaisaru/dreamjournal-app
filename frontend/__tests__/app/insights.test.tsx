import { render, screen } from "@testing-library/react";
import InsightsPage, { computeStreak } from "@/app/insights/page";
import type { Dream } from "@/app/types";

const mockUseAuth = jest.fn();
jest.mock("@/context/AuthContext", () => ({
  __esModule: true,
  useAuth: () => mockUseAuth(),
}));

const mockGet = jest.fn();
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
});
