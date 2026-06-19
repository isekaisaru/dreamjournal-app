import { act, fireEvent, render, screen } from "@testing-library/react";

import DreamEntryLauncher from "@/app/components/DreamEntryLauncher";
import { useAuth } from "@/context/AuthContext";
import useVoiceRecorder from "@/hooks/useVoiceRecorder";
import { uploadAndAnalyzeAudio } from "@/lib/audioAnalysis";
import type { User } from "@/app/types";

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
const mockedUpload = uploadAndAnalyzeAudio as jest.MockedFunction<
  typeof uploadAndAnalyzeAudio
>;

type AuthValue = ReturnType<typeof useAuth>;

// 可変の user。login で更新され、useAuth は毎レンダーこれを読む
let currentUser: Partial<User> | null = null;

const makeAuthValue = (): AuthValue =>
  ({
    authStatus: "authenticated",
    isLoggedIn: true,
    user: currentUser as AuthValue["user"],
    userId: "1",
    // login は本物と同じく user を差し替える（残り回数の即時反映を再現）
    login: ((u: User) => {
      currentUser = u;
    }) as AuthValue["login"],
    logout: jest.fn(),
    deleteUser: jest.fn(),
    error: null,
  }) as AuthValue;

const startRecording = jest.fn(() => Promise.resolve());
const stopRecording = jest.fn();
let capturedOnBlobReady: ((blob: Blob) => Promise<void> | void) | null = null;

const openSheet = () => {
  fireEvent.click(screen.getByRole("button", { name: /ゆめを のこす/ }));
};

beforeEach(() => {
  jest.clearAllMocks();
  currentUser = null;
  capturedOnBlobReady = null;
  mockedUseAuth.mockImplementation(() => makeAuthValue());
  mockedUseVoiceRecorder.mockImplementation((opts) => {
    capturedOnBlobReady = opts?.onBlobReady ?? null;
    return {
      isRecording: false,
      error: null,
      startRecording,
      stopRecording,
    } as ReturnType<typeof useVoiceRecorder>;
  });
});

describe("DreamEntryLauncher", () => {
  it("トライアルユーザーには残り回数バッジを表示する", () => {
    currentUser = { trial_user: true, premium: false, trial_audio_count: 0 };
    render(<DreamEntryLauncher buttonLabel="ゆめを のこす" />);
    openSheet();

    expect(screen.getByText("のこり 1かい")).toBeInTheDocument();
  });

  it("通常ユーザーには残り回数バッジを表示しない", () => {
    currentUser = { trial_user: false };
    render(<DreamEntryLauncher buttonLabel="ゆめを のこす" />);
    openSheet();

    expect(screen.queryByText(/のこり/)).not.toBeInTheDocument();
  });

  it("残り0回のトライアルユーザーは録音できず本登録CTAが出る", () => {
    currentUser = { trial_user: true, premium: false, trial_audio_count: 1 };
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
    currentUser = { trial_user: false, premium: false };
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

  it("トライアルユーザーは録音完了後に残り0回のCTAへ切り替わる", async () => {
    currentUser = { trial_user: true, premium: false, trial_audio_count: 0 };
    mockedUpload.mockResolvedValue({ message: "ok" } as Awaited<
      ReturnType<typeof uploadAndAnalyzeAudio>
    >);
    render(<DreamEntryLauncher buttonLabel="ゆめを のこす" />);
    openSheet();
    expect(screen.getByText("のこり 1かい")).toBeInTheDocument();

    // 録音完了（onBlobReady 呼び出し）をシミュレート
    await act(async () => {
      await capturedOnBlobReady?.(new Blob());
    });

    // 成功でシートは自動で閉じるので、もう一度開く
    openSheet();
    expect(screen.getByText("のこり 0かい")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /とうろくして もっと はなす/ })
    ).toBeInTheDocument();
  });
});
