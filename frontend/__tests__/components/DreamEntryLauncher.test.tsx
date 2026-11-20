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

const mockGetAudioQuota = jest.fn<(...args: unknown[]) => Promise<unknown>>();
jest.mock("@/lib/apiClient", () => ({
  getAudioQuota: (...args: unknown[]) => mockGetAudioQuota(...args),
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
const cancelRecording = jest.fn();
let capturedOnBlobReady: ((blob: Blob) => Promise<void> | void) | null = null;

const openSheet = () => {
  fireEvent.click(screen.getByRole("button", { name: /ゆめを のこす/ }));
};

beforeEach(() => {
  jest.clearAllMocks();
  currentUser = null;
  capturedOnBlobReady = null;
  // 既定では残り回数の応答を返さないまま（読み込み中）にする
  mockGetAudioQuota.mockImplementation(() => new Promise(() => {}));
  mockedUseAuth.mockImplementation(() => makeAuthValue());
  mockedUseVoiceRecorder.mockImplementation((opts) => {
    capturedOnBlobReady = opts?.onBlobReady ?? null;
    return {
      isRecording: false,
      error: null,
      startRecording,
      stopRecording,
      cancelRecording,
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

  it("無料プランでも残り回数を読み込み中のあいだはバッジを表示しない", () => {
    currentUser = { trial_user: false };
    render(<DreamEntryLauncher buttonLabel="ゆめを のこす" />);
    openSheet();

    expect(screen.queryByText(/のこり/)).not.toBeInTheDocument();
  });

  it("プレミアム会員には残り回数バッジを出さず、残り回数も取りにいかない", () => {
    currentUser = { trial_user: false, premium: true };
    render(<DreamEntryLauncher buttonLabel="ゆめを のこす" />);
    openSheet();

    expect(screen.queryByText(/のこり/)).not.toBeInTheDocument();
    expect(mockGetAudioQuota).not.toHaveBeenCalled();
  });

  it("お試しユーザーは残り回数をサーバーに取りにいかない（user の回数を使う）", () => {
    currentUser = { trial_user: true, premium: false, trial_audio_count: 0 };
    render(<DreamEntryLauncher buttonLabel="ゆめを のこす" />);

    expect(mockGetAudioQuota).not.toHaveBeenCalled();
  });

  describe("無料プラン（月の上限）", () => {
    it("今月の残り回数をバッジで表示する", async () => {
      currentUser = { trial_user: false, premium: false };
      mockGetAudioQuota.mockResolvedValue({ used: 2, limit: 5, remaining: 3 });
      render(<DreamEntryLauncher buttonLabel="ゆめを のこす" />);
      openSheet();

      expect(await screen.findByText("のこり 3かい")).toBeInTheDocument();
    });

    it("残り0回なら録音を始めず、プレミアムへの案内を出す", async () => {
      currentUser = { trial_user: false, premium: false };
      mockGetAudioQuota.mockResolvedValue({ used: 5, limit: 5, remaining: 0 });
      render(<DreamEntryLauncher buttonLabel="ゆめを のこす" />);
      openSheet();

      const cta = await screen.findByRole("link", {
        name: /プレミアムで もっと はなす/,
      });
      expect(cta).toHaveAttribute("href", "/subscription");
      expect(screen.getByText("こんげつの ぶんは おしまい だよ")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /こえで はなす/ }));
      expect(startRecording).not.toHaveBeenCalled();
    });

    it("残り0回なら voiceFirst でも録音を始めない", async () => {
      currentUser = { trial_user: false, premium: false };
      mockGetAudioQuota.mockResolvedValue({ used: 5, limit: 5, remaining: 0 });
      render(<DreamEntryLauncher buttonLabel="ゆめを のこす" voiceFirst />);
      await act(async () => {});

      openSheet();

      expect(startRecording).not.toHaveBeenCalled();
      expect(
        screen.getByRole("link", { name: /プレミアムで もっと はなす/ })
      ).toBeInTheDocument();
    });

    it("録音が成功したら残り回数を1つ減らす", async () => {
      currentUser = { trial_user: false, premium: false };
      mockGetAudioQuota.mockResolvedValue({ used: 4, limit: 5, remaining: 1 });
      mockedUpload.mockResolvedValue({ message: "ok" } as Awaited<
        ReturnType<typeof uploadAndAnalyzeAudio>
      >);
      render(<DreamEntryLauncher buttonLabel="ゆめを のこす" />);
      openSheet();
      expect(await screen.findByText("のこり 1かい")).toBeInTheDocument();

      await act(async () => {
        await capturedOnBlobReady?.(new Blob());
      });

      openSheet();
      expect(screen.getByText("のこり 0かい")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /プレミアムで もっと はなす/ })
      ).toBeInTheDocument();
    });
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

  it("voiceFirstでは起動ボタンの1回目で録音を始める", () => {
    currentUser = { trial_user: false, premium: false };
    render(
      <DreamEntryLauncher buttonLabel="ゆめを のこす" voiceFirst />
    );

    openSheet();

    expect(startRecording).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog", { name: "音声で記録" })).toBeInTheDocument();
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
