import { act, renderHook } from "@testing-library/react";

import useVoiceRecorder from "@/hooks/useVoiceRecorder";

jest.mock("@/lib/toast", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

type RecorderOptions = ConstructorParameters<typeof MediaRecorder>[1];

const makeTrack = () =>
  ({
    muted: false,
    stop: jest.fn(),
  }) as unknown as MediaStreamTrack;

const makeStream = () => {
  const track = makeTrack();
  return {
    getAudioTracks: jest.fn(() => [track]),
    getTracks: jest.fn(() => [track]),
  } as unknown as MediaStream;
};

describe("useVoiceRecorder", () => {
  let constructorOptions: Array<RecorderOptions | undefined>;
  let getUserMedia: jest.Mock;
  let enumerateDevices: jest.Mock;

  beforeEach(() => {
    constructorOptions = [];
    getUserMedia = jest.fn(async () => makeStream());
    enumerateDevices = jest.fn(async () => []);

    class FakeMediaRecorder {
      static isTypeSupported = jest.fn(() => false);
      state = "inactive";
      ondataavailable: ((event: BlobEvent) => void) | null = null;
      onstop: (() => void) | null = null;

      constructor(_stream: MediaStream, options?: RecorderOptions) {
        constructorOptions.push(options);
      }

      start() {
        this.state = "recording";
      }

      stop() {
        this.state = "inactive";
        this.onstop?.();
      }
    }

    Object.defineProperty(global, "MediaRecorder", {
      configurable: true,
      writable: true,
      value: FakeMediaRecorder,
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia,
        enumerateDevices,
      },
    });
  });

  it("マイク権限取得後にデバイス一覧を確認する", async () => {
    const calls: string[] = [];
    getUserMedia.mockImplementation(async () => {
      calls.push("getUserMedia");
      return makeStream();
    });
    enumerateDevices.mockImplementation(async () => {
      calls.push("enumerateDevices");
      return [];
    });

    const { result } = renderHook(() =>
      useVoiceRecorder({ onBlobReady: jest.fn() })
    );

    await act(async () => {
      await result.current.startRecording();
    });

    expect(calls).toEqual(["getUserMedia", "enumerateDevices"]);
  });

  it("対応MIMEが見つからない場合はmimeTypeなしでMediaRecorderを作る", async () => {
    const { result } = renderHook(() =>
      useVoiceRecorder({ onBlobReady: jest.fn() })
    );

    await act(async () => {
      await result.current.startRecording();
    });

    expect(constructorOptions).toEqual([undefined]);
  });

  it("デバイス一覧取得に失敗しても最初に取得したマイクで録音を始める", async () => {
    enumerateDevices.mockRejectedValue(new Error("not allowed"));

    const { result } = renderHook(() =>
      useVoiceRecorder({ onBlobReady: jest.fn() })
    );

    await act(async () => {
      await result.current.startRecording();
    });

    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(constructorOptions).toHaveLength(1);
    expect(result.current.isRecording).toBe(true);
  });
});
