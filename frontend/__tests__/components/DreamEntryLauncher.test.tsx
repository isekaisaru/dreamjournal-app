import { fireEvent, render, screen } from "@testing-library/react";

import DreamEntryLauncher from "@/app/components/DreamEntryLauncher";
import { useAuth } from "@/context/AuthContext";
import useVoiceRecorder from "@/hooks/useVoiceRecorder";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock("@/context/AuthContext", () => ({
  __esModule: true,
  useAuth: jest.fn(),
}));

jest.mock("@/hooks/useVoiceRecorder", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@/lib/audioAnalysis", () => ({
  uploadAndAnalyzeAudio: jest.fn(),
}));

jest.mock("@/lib/toast", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedUseVoiceRecorder = useVoiceRecorder as jest.MockedFunction<
  typeof useVoiceRecorder
>;

type AuthValue = ReturnType<typeof useAuth>;

const makeAuthValue = (user: Partial<NonNullable<AuthValue["user"]>> | null) =>
  ({
    authStatus: "authenticated",
    isLoggedIn: true,
    user: user as AuthValue["user"],
    userId: "1",
    login: jest.fn(),
    logout: jest.fn(),
    deleteUser: jest.fn(),
    error: null,
  }) as AuthValue;

const startRecording = jest.fn(() => Promise.resolve());
const stopRecording = jest.fn();

const openSheet = () => {
  fireEvent.click(screen.getByRole("button", { name: /ゆめを のこす/ }));
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseVoiceRecorder.mockReturnValue({
    isRecording: false,
    error: null,
    startRecording,
    stopRecording,
  } as ReturnType<typeof useVoiceRecorder>);
});

describe("DreamEntryLauncher", () => {
  it("トライアルユーザーには残り回数バッジを表示する", () => {
    mockedUseAuth.mockReturnValue(
      makeAuthValue({ trial_user: true, premium: false, trial_audio_count: 0 })
    );
    render(<DreamEntryLauncher buttonLabel="ゆめを のこす" />);
    openSheet();

    expect(screen.getByText("のこり 1かい")).toBeInTheDocument();
  });

  it("通常ユーザーには残り回数バッジを表示しない", () => {
    mockedUseAuth.mockReturnValue(makeAuthValue({ trial_user: false }));
    render(<DreamEntryLauncher buttonLabel="ゆめを のこす" />);
    openSheet();

    expect(screen.queryByText(/のこり/)).not.toBeInTheDocument();
  });

  it("残り0回のトライアルユーザーは録音できず本登録CTAが出る", () => {
    mockedUseAuth.mockReturnValue(
      makeAuthValue({ trial_user: true, premium: false, trial_audio_count: 1 })
    );
    render(<DreamEntryLauncher buttonLabel="ゆめを のこす" />);
    openSheet();

    const voiceButton = screen.getByRole("button", { name: /こえで はなす/ });
    fireEvent.click(voiceButton);

    expect(startRecording).not.toHaveBeenCalled();
    expect(
      screen.getByRole("link", { name: /とうろくして もっと はなす/ })
    ).toBeInTheDocument();
  });

  it("こえで はなすは1回目で録音せず、2回目で録音を始める", () => {
    mockedUseAuth.mockReturnValue(
      makeAuthValue({ trial_user: false, premium: false })
    );
    render(<DreamEntryLauncher buttonLabel="ゆめを のこす" />);
    openSheet();

    // 1回目: 確認状態になり、まだ録音しない
    fireEvent.click(screen.getByRole("button", { name: /こえで はなす/ }));
    expect(startRecording).not.toHaveBeenCalled();
    expect(screen.getByText("はなしはじめる")).toBeInTheDocument();

    // 2回目: 録音を始める
    fireEvent.click(screen.getByRole("button", { name: /はなしはじめる/ }));
    expect(startRecording).toHaveBeenCalledTimes(1);
  });
});
