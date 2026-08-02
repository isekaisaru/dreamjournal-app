import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import TrialPage from "@/app/trial/page";
import { useAuth } from "@/context/AuthContext";
import apiClient, {
  createDream,
  previewAnalysis,
  verifyAuth,
} from "@/lib/apiClient";

// 体験版で書いた夢がDBに保存されず、再読み込みや本登録で消えていた問題
// （2026-07-22・2026-08-02のTrial P3 QAを2回無効化した実データ損失バグ）の回帰テスト。
// 「記録した夢」と画面に出る以上、実際にDBへ保存されていなければならない。
jest.mock("@/context/AuthContext", () => ({
  __esModule: true,
  useAuth: jest.fn(),
}));

jest.mock("@/lib/apiClient", () => ({
  __esModule: true,
  default: { post: jest.fn() },
  createDream: jest.fn(),
  previewAnalysis: jest.fn(),
  verifyAuth: jest.fn(),
}));

jest.mock("@/app/components/MorpheusSmall", () => ({
  __esModule: true,
  default: () => <div data-testid="morpheus-small" />,
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedCreateDream = createDream as jest.MockedFunction<typeof createDream>;
const mockedPreviewAnalysis = previewAnalysis as jest.MockedFunction<
  typeof previewAnalysis
>;
const mockedVerifyAuth = verifyAuth as jest.MockedFunction<typeof verifyAuth>;
const mockedPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;

type AuthValue = ReturnType<typeof useAuth>;

const makeAuth = (over: Partial<AuthValue> = {}): AuthValue =>
  ({
    authStatus: "authenticated",
    isLoggedIn: true,
    user: { id: "1", trial_user: true },
    userId: "1",
    login: jest.fn(),
    logout: jest.fn(),
    deleteUser: jest.fn(),
    error: null,
    ...over,
  }) as AuthValue;

const writeDream = (text: string) => {
  fireEvent.change(
    screen.getByPlaceholderText("今朝見た夢を書いてみてください..."),
    { target: { value: text } }
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseAuth.mockReturnValue(makeAuth());
  mockedCreateDream.mockResolvedValue({ id: 1 } as Awaited<
    ReturnType<typeof createDream>
  >);
  mockedPreviewAnalysis.mockResolvedValue({
    analysis: "やさしい ゆめ だね",
    emotion_tags: ["うれしい"],
  });
});

describe("TrialPage: 体験版の夢をDBへ保存する", () => {
  it("「記録だけする」でDBへ保存する（stateだけに積まない）", async () => {
    render(<TrialPage />);
    writeDream("青い扉の夢");

    fireEvent.click(screen.getByRole("button", { name: /記録だけする/ }));

    await waitFor(() => {
      expect(mockedCreateDream).toHaveBeenCalledWith(
        expect.objectContaining({ content: "青い扉の夢" })
      );
    });
  });

  it("「AIにきいてみる」でも分析結果ごとDBへ保存する", async () => {
    render(<TrialPage />);
    writeDream("空を飛ぶ夢");

    fireEvent.click(screen.getByRole("button", { name: /AIにきいてみる/ }));

    await waitFor(() => {
      expect(mockedCreateDream).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "空を飛ぶ夢",
          analysis_json: { analysis: "やさしい ゆめ だね", emotion_tags: ["うれしい"] },
          analysis_status: "done",
        })
      );
    });
  });

  it("タイトル未入力なら既定の名前で保存する", async () => {
    render(<TrialPage />);
    writeDream("なまえのない夢");

    fireEvent.click(screen.getByRole("button", { name: /記録だけする/ }));

    await waitFor(() => {
      expect(mockedCreateDream).toHaveBeenCalledWith(
        expect.objectContaining({ title: "ゆめ 1" })
      );
    });
  });

  it("保存に失敗したら一覧へ足さず、エラーを表示する（画面が嘘をつかない）", async () => {
    mockedCreateDream.mockRejectedValue(new Error("boom"));
    render(<TrialPage />);
    writeDream("ほぞんに しっぱいする ゆめ");

    fireEvent.click(screen.getByRole("button", { name: /記録だけする/ }));

    expect(
      await screen.findByText("ゆめを のこせなかったよ。もういちど ためしてね。")
    ).toBeInTheDocument();
    // 保存できていないのに「記録した夢」へ増やさない
    expect(screen.getByText(/記録した夢 \(0\/7\)/)).toBeInTheDocument();
  });

  it("未認証ならトライアルアカウントを作ってから保存する", async () => {
    mockedUseAuth.mockReturnValue(
      makeAuth({ authStatus: "unauthenticated", isLoggedIn: false, user: null })
    );
    mockedVerifyAuth.mockResolvedValue(null);
    mockedPost.mockResolvedValue({ user: { id: 9 } } as never);

    render(<TrialPage />);
    writeDream("みとうろくの ゆめ");

    fireEvent.click(screen.getByRole("button", { name: /記録だけする/ }));

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith(
        "/auth/trial_login",
        expect.anything()
      );
    });
    await waitFor(() => expect(mockedCreateDream).toHaveBeenCalled());
  });
});
