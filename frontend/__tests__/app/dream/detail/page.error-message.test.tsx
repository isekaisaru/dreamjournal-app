import React from "react";
import { render, screen } from "@testing-library/react";

import DreamDetailPage from "@/app/dream/[id]/page";
import {
  NETWORK_ERROR_MESSAGE,
  TIMEOUT_ERROR_MESSAGE,
} from "@/lib/friendlyErrors";

const mockUseDream = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "1", age_group: "adult" } }),
}));

jest.mock("@/hooks/useDream", () => ({
  useDream: (...args: unknown[]) => mockUseDream(...args),
}));

jest.mock("@/lib/apiClient", () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.resolve({ used: 0, limit: 3, remaining: 3 })),
    post: jest.fn(),
  },
  isEmailVerificationRequiredError: () => false,
}));

jest.mock("@/app/components/DreamForm", () => ({
  __esModule: true,
  default: () => <div>DreamForm</div>,
}));
jest.mock("@/app/components/DeleteButton", () => ({
  __esModule: true,
  default: () => <div>DeleteButton</div>,
}));
jest.mock("@/app/components/DreamShareCard", () => ({
  __esModule: true,
  default: () => <div>DreamShareCard</div>,
}));
jest.mock("@/app/components/EmotionTag", () => ({
  EmotionTag: ({ label }: { label: string }) => <span>{label}</span>,
  getChildFriendlyEmotionLabel: (label: string) => label,
}));
jest.mock("@/app/components/EmailVerificationBanner", () => ({
  __esModule: true,
  default: () => <div>EmailVerificationBanner</div>,
}));
jest.mock("@/app/components/MorpheusGuide", () => ({
  MorpheusGuideDetail: () => <div>MorpheusGuideDetail</div>,
}));
jest.mock("@/app/components/StreamingAnalysis", () => ({
  __esModule: true,
  default: () => <div>StreamingAnalysis</div>,
}));

// React の `use` が同期的に読める、解決済みの thenable
const resolvedParams = Object.assign(Promise.resolve({ id: "1" }), {
  status: "fulfilled",
  value: { id: "1" },
}) as Promise<{ id: string }>;

const renderWithError = (error: string) => {
  mockUseDream.mockReturnValue({
    dream: null,
    error,
    isLoading: false,
    isUpdating: false,
    updateDream: jest.fn(),
    deleteDream: jest.fn(),
  });
  jest.spyOn(console, "error").mockImplementation(() => {});
  return render(<DreamDetailPage params={resolvedParams} />);
};

describe("夢の詳細ページ: 読み込みエラーの表示", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("タイムアウトの英語メッセージを画面に出さず、日本語にする", () => {
    renderWithError("API request to /dreams/1 timed out after 15s.");

    expect(screen.getByText(`エラー: ${TIMEOUT_ERROR_MESSAGE}`)).toBeTruthy();
    expect(screen.queryByText(/timed out/i)).toBeNull();
  });

  it("通信失敗の英語メッセージを画面に出さず、日本語にする", () => {
    renderWithError("Failed to fetch");

    expect(screen.getByText(`エラー: ${NETWORK_ERROR_MESSAGE}`)).toBeTruthy();
    expect(screen.queryByText(/failed to fetch/i)).toBeNull();
  });

  it("その他のエラーは従来どおりそのまま表示する", () => {
    renderWithError("ログインが必要です");

    expect(screen.getByText("エラー: ログインが必要です")).toBeTruthy();
  });
});
