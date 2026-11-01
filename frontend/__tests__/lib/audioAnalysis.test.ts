import {
  AUDIO_UPLOAD_TIMEOUT_MESSAGE,
  AUDIO_UPLOAD_TIMEOUT_MS,
  AudioUploadError,
  uploadAndAnalyzeAudio,
} from "@/lib/audioAnalysis";

const makeBlob = () => new Blob(["dream-audio"], { type: "audio/webm" });

const jsonResponse = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as Response;

describe("uploadAndAnalyzeAudio", () => {
  const originalFetch = global.fetch;
  let fetchMock: ReturnType<typeof jest.fn>;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("成功時は解析結果を返し、タイムアウト用のタイマーを残さない", async () => {
    jest.useFakeTimers();
    fetchMock.mockResolvedValue(jsonResponse({ id: 1, message: "ok" }));

    await expect(uploadAndAnalyzeAudio(makeBlob())).resolves.toEqual({
      id: 1,
      message: "ok",
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/analyze_audio_dream");
    expect(init.method).toBe("POST");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("応答が返らないままタイムアウトすると再送を促すエラーにする", async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        })
    );

    const promise = uploadAndAnalyzeAudio(makeBlob());
    const assertion = expect(promise).rejects.toThrow(
      AUDIO_UPLOAD_TIMEOUT_MESSAGE
    );

    jest.advanceTimersByTime(AUDIO_UPLOAD_TIMEOUT_MS);
    await assertion;
  });

  it("タイムアウトは再送できて、保存済みの可能性がある失敗として扱う", async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        })
    );

    const promise = uploadAndAnalyzeAudio(makeBlob());
    const caught = promise.catch((e) => e);
    jest.advanceTimersByTime(AUDIO_UPLOAD_TIMEOUT_MS);
    const err = await caught;

    expect(err).toBeInstanceOf(AudioUploadError);
    expect(err).toBeInstanceOf(Error);
    expect(err.retryable).toBe(true);
    expect(err.maybeSaved).toBe(true);
  });

  it.each([
    [504, undefined, true, true],
    [503, undefined, true, false],
    [500, undefined, true, false],
    [422, undefined, false, false],
    [400, undefined, false, false],
    [403, { limit_reached: true }, false, false],
    [403, { email_verification_required: true }, true, false],
  ])(
    "HTTP %i %j は retryable=%s / maybeSaved=%s として扱う",
    async (status, extra, retryable, maybeSaved) => {
      fetchMock.mockResolvedValue(
        jsonResponse({ error: "エラーです。", ...extra }, status)
      );

      const err = await uploadAndAnalyzeAudio(makeBlob()).catch((e) => e);

      expect(err).toBeInstanceOf(AudioUploadError);
      expect(err.message).toBe("エラーです。");
      expect(err.status).toBe(status);
      expect(err.retryable).toBe(retryable);
      expect(err.maybeSaved).toBe(maybeSaved);
    }
  );

  it("タイムアウト前の応答は中断しない", async () => {
    jest.useFakeTimers();
    let aborted = false;
    fetchMock.mockImplementation((_url: string, init: RequestInit) => {
      init.signal?.addEventListener("abort", () => {
        aborted = true;
      });
      return Promise.resolve(jsonResponse({ id: 2 }));
    });

    await uploadAndAnalyzeAudio(makeBlob());
    jest.advanceTimersByTime(AUDIO_UPLOAD_TIMEOUT_MS);

    expect(aborted).toBe(false);
  });

  it("サーバーのエラーメッセージはそのまま伝える", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error:
            "音声分析サービスへの接続がタイムアウトしました。再度お試しください。",
        },
        504
      )
    );

    await expect(uploadAndAnalyzeAudio(makeBlob())).rejects.toThrow(
      "音声分析サービスへの接続がタイムアウトしました。再度お試しください。"
    );
  });

  it("中断以外の通信エラーはそのまま投げ直す", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const err = await uploadAndAnalyzeAudio(makeBlob()).catch((e) => e);

    expect(err).toBeInstanceOf(TypeError);
    expect(err.message).toBe("Failed to fetch");
  });
});
