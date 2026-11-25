import { act, fireEvent, render, screen } from "@testing-library/react";

import DreamEntryLauncher from "@/app/components/DreamEntryLauncher";
import { useAuth } from "@/context/AuthContext";
import useVoiceRecorder from "@/hooks/useVoiceRecorder";
import {
  AUDIO_UPLOAD_TIMEOUT_MESSAGE,
  AudioUploadError,
  uploadAndAnalyzeAudio,
} from "@/lib/audioAnalysis";
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
  ...(jest.requireActual("@/lib/audioAnalysis") as Record<string, unknown>),
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

  describe("送信失敗時の録音保持", () => {
    const makeBlob = () =>
      new Blob(["dream-audio"], { type: "audio/webm" });

    const failOnce = (message: string) => {
      mockedUpload.mockRejectedValueOnce(new Error(message));
    };

    it("送信に失敗しても録音を保持し、再送と破棄の操作を出す", async () => {
      currentUser = { trial_user: false, premium: false };
      failOnce("音声分析サービスへの接続に失敗しました。");
      render(<DreamEntryLauncher buttonLabel="ゆめを のこす" />);
      openSheet();

      await act(async () => {
        await capturedOnBlobReady?.(makeBlob());
      });

      expect(
        screen.getByText("音声分析サービスへの接続に失敗しました。")
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "もう一度送信" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "録音を破棄" })
      ).toBeInTheDocument();
      // 自動再送はしない
      expect(mockedUpload).toHaveBeenCalledTimes(1);
    });

    it("もう一度送信は同じ録音 Blob を再送する", async () => {
      currentUser = { trial_user: false, premium: false };
      const blob = makeBlob();
      failOnce("音声分析サービスへの接続に失敗しました。");
      mockedUpload.mockResolvedValueOnce({ message: "ok" } as Awaited<
        ReturnType<typeof uploadAndAnalyzeAudio>
      >);
      render(<DreamEntryLauncher buttonLabel="ゆめを のこす" />);
      openSheet();

      await act(async () => {
        await capturedOnBlobReady?.(blob);
      });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "もう一度送信" }));
      });

      expect(mockedUpload).toHaveBeenCalledTimes(2);
      expect(mockedUpload.mock.calls[0][0]).toBe(blob);
      expect(mockedUpload.mock.calls[1][0]).toBe(blob);
      // 成功するとシートは閉じる。開き直しても、保持していた録音が
      // クリアされていて再送パネルも案内も出ないことを確認する
      openSheet();
      expect(
        screen.queryByRole("button", { name: "もう一度送信" })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "録音を破棄" })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/さきに のこっている 録音/)
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /こえで はなす/ })
      ).toBeEnabled();
    });

    it("送信中は同じ録音を二重送信しない", async () => {
      currentUser = { trial_user: false, premium: false };
      let resolveUpload: (value: { message: string }) => void = () => {};
      mockedUpload.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveUpload = resolve as typeof resolveUpload;
          }) as ReturnType<typeof uploadAndAnalyzeAudio>
      );
      render(<DreamEntryLauncher buttonLabel="ゆめを のこす" />);
      openSheet();

      const blob = makeBlob();
      let first: Promise<void> | void = undefined;
      await act(async () => {
        first = capturedOnBlobReady?.(blob);
        await capturedOnBlobReady?.(blob);
      });

      expect(mockedUpload).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveUpload({ message: "ok" });
        await first;
      });
    });

    it("録音を破棄すると保持していた録音と操作が消える", async () => {
      currentUser = { trial_user: false, premium: false };
      failOnce("音声分析サービスへの接続に失敗しました。");
      render(<DreamEntryLauncher buttonLabel="ゆめを のこす" />);
      openSheet();

      await act(async () => {
        await capturedOnBlobReady?.(makeBlob());
      });

      fireEvent.click(screen.getByRole("button", { name: "録音を破棄" }));

      expect(
        screen.queryByRole("button", { name: "もう一度送信" })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("音声分析サービスへの接続に失敗しました。")
      ).not.toBeInTheDocument();
      expect(mockedUpload).toHaveBeenCalledTimes(1);
    });

    const savedNotice = /すでに ほぞんされている ことが あるよ/;

    it("タイムアウトは再送できる失敗として案内し、保存済みの可能性を伝える", async () => {
      currentUser = { trial_user: false, premium: false };
      mockedUpload.mockRejectedValueOnce(
        new AudioUploadError(AUDIO_UPLOAD_TIMEOUT_MESSAGE, {
          retryable: true,
          maybeSaved: true,
        })
      );
      render(<DreamEntryLauncher buttonLabel="ゆめを のこす" />);
      openSheet();

      await act(async () => {
        await capturedOnBlobReady?.(makeBlob());
      });

      expect(
        screen.getByText(AUDIO_UPLOAD_TIMEOUT_MESSAGE)
      ).toBeInTheDocument();
      expect(screen.getByText(savedNotice)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "もう一度送信" })
      ).toBeInTheDocument();
    });

    it("504 でも保存済みの可能性を伝え、再送は残す", async () => {
      currentUser = { trial_user: false, premium: false };
      mockedUpload.mockRejectedValueOnce(
        new AudioUploadError("音声分析サービスへの接続がタイムアウトしました。", {
          status: 504,
          maybeSaved: true,
        })
      );
      render(<DreamEntryLauncher buttonLabel="ゆめを のこす" />);
      openSheet();

      await act(async () => {
        await capturedOnBlobReady?.(makeBlob());
      });

      expect(screen.getByText(savedNotice)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "もう一度送信" })
      ).toBeInTheDocument();
    });

    it("保存済みの可能性がない失敗では注意書きを出さない", async () => {
      currentUser = { trial_user: false, premium: false };
      failOnce("音声分析サービスへの接続に失敗しました。");
      render(<DreamEntryLauncher buttonLabel="ゆめを のこす" />);
      openSheet();

      await act(async () => {
        await capturedOnBlobReady?.(makeBlob());
      });

      expect(screen.queryByText(savedNotice)).not.toBeInTheDocument();
    });

    it("再送しても変わらない失敗（無音など）では再送ボタンを出さず破棄だけ出す", async () => {
      currentUser = { trial_user: false, premium: false };
      mockedUpload.mockRejectedValueOnce(
        new AudioUploadError("音声ファイルが小さすぎるか、無音の可能性があります。", {
          status: 422,
          retryable: false,
        })
      );
      render(<DreamEntryLauncher buttonLabel="ゆめを のこす" />);
      openSheet();

      await act(async () => {
        await capturedOnBlobReady?.(makeBlob());
      });

      expect(
        screen.getByText("音声ファイルが小さすぎるか、無音の可能性があります。")
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "もう一度送信" })
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "録音を破棄" })
      ).toBeInTheDocument();
      expect(mockedUpload).toHaveBeenCalledTimes(1);
    });

    it("失敗パネルにページ離脱で録音が消えることを案内する", async () => {
      currentUser = { trial_user: false, premium: false };
      failOnce("音声分析サービスへの接続に失敗しました。");
      render(<DreamEntryLauncher buttonLabel="ゆめを のこす" />);
      openSheet();

      await act(async () => {
        await capturedOnBlobReady?.(makeBlob());
      });

      expect(
        screen.getByText("このページを はなれると 録音は きえるよ。")
      ).toBeInTheDocument();
    });

    it("録音が残っている間は「こえで はなす」を押せず、案内を出す", async () => {
      currentUser = { trial_user: false, premium: false };
      failOnce("音声分析サービスへの接続に失敗しました。");
      render(<DreamEntryLauncher buttonLabel="ゆめを のこす" />);
      openSheet();

      await act(async () => {
        await capturedOnBlobReady?.(makeBlob());
      });

      const voiceButton = screen.getByRole("button", { name: /こえで はなす/ });
      expect(voiceButton).toBeDisabled();
      expect(
        screen.getByText("さきに のこっている 録音を おくるか すてるか してね")
      ).toBeInTheDocument();
      fireEvent.click(voiceButton);
      expect(startRecording).not.toHaveBeenCalled();
      expect(screen.queryByText("はなしはじめる")).not.toBeInTheDocument();

      // 破棄すれば、また録音を始められる
      fireEvent.click(screen.getByRole("button", { name: "録音を破棄" }));
      expect(
        screen.getByRole("button", { name: /こえで はなす/ })
      ).toBeEnabled();
    });

    it("録音が残っている間は voiceFirst でも新しい録音を自動で始めない", async () => {
      currentUser = { trial_user: false, premium: false };
      failOnce("音声分析サービスへの接続に失敗しました。");
      render(<DreamEntryLauncher buttonLabel="ゆめを のこす" voiceFirst />);
      openSheet();
      expect(startRecording).toHaveBeenCalledTimes(1);

      await act(async () => {
        await capturedOnBlobReady?.(makeBlob());
      });

      // 録音画面を閉じてから、もう一度起動ボタンを押す
      fireEvent.click(
        screen.getByRole("button", { name: "音声記録を閉じる" })
      );
      openSheet();

      expect(startRecording).toHaveBeenCalledTimes(1);
      expect(
        screen.getByRole("button", { name: "もう一度送信" })
      ).toBeInTheDocument();
    });
  });
});
