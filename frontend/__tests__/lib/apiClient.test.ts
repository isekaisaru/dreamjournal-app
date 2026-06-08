import { apiFetch, clientLogin } from "../../lib/apiClient";

describe("apiFetch timeout policy", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.spyOn(global, "setTimeout");
    global.fetch = jest.fn<() => Promise<Response>>().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it("uses a longer default timeout for auth endpoints", async () => {
    await expect(apiFetch("/auth/login")).rejects.toThrow("network down");

    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 45_000);
  });

  it("keeps the default timeout for non-auth endpoints", async () => {
    await expect(apiFetch("/dreams")).rejects.toThrow("network down");

    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 15_000);
  });

  it("preserves plain-text error bodies when the upstream response is not JSON", async () => {
    global.fetch = jest.fn<() => Promise<Response>>().mockResolvedValue({
      ok: false,
      status: 502,
      json: jest.fn<() => Promise<unknown>>().mockRejectedValue(new Error("invalid json")),
      text: jest.fn<() => Promise<string>>().mockResolvedValue("upstream connect error or disconnect/reset before headers"),
    } as unknown as Response) as unknown as typeof fetch;

    await expect(apiFetch("/dreams")).rejects.toThrow(
      "upstream connect error or disconnect/reset before headers"
    );
  });

  it.each(["/auth/verify", "/auth/me"])(
    "tries refresh and retries the original request when %s returns 401",
    async (endpoint) => {
      const fetchMock = jest
        .fn<() => Promise<Response>>()
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: jest.fn<() => Promise<string>>().mockResolvedValue(""),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: jest.fn<() => Promise<string>>().mockResolvedValue(""),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn<() => Promise<unknown>>().mockResolvedValue({
            user: { id: 1, email: "test@example.com" },
          }),
        } as unknown as Response);
      global.fetch = fetchMock as unknown as typeof fetch;

      await expect(apiFetch(endpoint)).resolves.toEqual({
        user: { id: 1, email: "test@example.com" },
      });

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(fetchMock.mock.calls[1][0]).toContain("/auth/refresh");
      expect(fetchMock.mock.calls[2][0]).toContain(endpoint);
    }
  );

  it("does not try refresh again when the retried original request still returns 401", async () => {
    const fetchMock = jest
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: jest.fn<() => Promise<string>>().mockResolvedValue(""),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn<() => Promise<string>>().mockResolvedValue(""),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: jest.fn<() => Promise<string>>().mockResolvedValue(""),
      } as unknown as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(apiFetch("/auth/verify")).rejects.toMatchObject({ status: 401 });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toContain("/auth/refresh");
    expect(fetchMock.mock.calls[2][0]).toContain("/auth/verify");
  });

  it.each(["/auth/login", "/auth/logout", "/auth/refresh", "/auth/register"])(
    "does not try refresh when %s returns 401",
    async (endpoint) => {
      const fetchMock = jest.fn<() => Promise<Response>>().mockResolvedValue({
        ok: false,
        status: 401,
        text: jest.fn<() => Promise<string>>().mockResolvedValue(""),
      } as unknown as Response);
      global.fetch = fetchMock as unknown as typeof fetch;

      await expect(apiFetch(endpoint)).rejects.toMatchObject({ status: 401 });

      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  );

  it("returns the original 401 when refresh fails", async () => {
    const fetchMock = jest
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: jest.fn<() => Promise<string>>().mockResolvedValue(""),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: jest.fn<() => Promise<string>>().mockResolvedValue(""),
      } as unknown as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(apiFetch("/auth/verify")).rejects.toMatchObject({ status: 401 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain("/auth/refresh");
  });
});

describe("clientLogin cold-start retry", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    // restoreAllMocks() を useRealTimers() より先に呼ぶ。逆順だと、フェイクタイマー下で
    // 張った setTimeout の spy を復元する際に実タイマーへ戻らず、次のテストへ漏れる。
    jest.restoreAllMocks();
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  const credentials = { email: "test@example.com", password: "password" };

  // 本番のコールドスタートを忠実に再現: fetch が AbortError で reject すると
  // apiFetch がタイムアウトとして ApiError(status=504) に変換する。
  const timeoutRejection = () => {
    const error = new Error("aborted");
    error.name = "AbortError";
    return error;
  };

  const loginResponse = () =>
    ({
      ok: true,
      status: 200,
      json: jest
        .fn<() => Promise<unknown>>()
        .mockResolvedValue({ user: { id: 1, email: "test@example.com" } }),
    } as unknown as Response);

  const errorResponse = (status: number) =>
    ({
      ok: false,
      status,
      text: jest.fn<() => Promise<string>>().mockResolvedValue(""),
    } as unknown as Response);

  it("retries once after a timeout and resolves on the second attempt", async () => {
    const fetchMock = jest
      .fn<() => Promise<Response>>()
      .mockRejectedValueOnce(timeoutRejection())
      .mockResolvedValueOnce(loginResponse());
    global.fetch = fetchMock as unknown as typeof fetch;
    const onColdStartRetry = jest.fn();

    await expect(
      clientLogin(credentials, { onColdStartRetry, retryDelayMs: 0 })
    ).resolves.toEqual({ user: { id: "1", email: "test@example.com" } });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onColdStartRetry).toHaveBeenCalledTimes(1);
    expect(onColdStartRetry).toHaveBeenCalledWith(1);
  });

  it("waits 2 seconds by default before retrying", async () => {
    jest.useFakeTimers();
    const setTimeoutSpy = jest.spyOn(global, "setTimeout");
    const fetchMock = jest
      .fn<() => Promise<Response>>()
      .mockRejectedValueOnce(timeoutRejection())
      .mockResolvedValueOnce(loginResponse());
    global.fetch = fetchMock as unknown as typeof fetch;

    const promise = clientLogin(credentials);
    await jest.advanceTimersByTimeAsync(2_000);
    await promise;

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2_000);
  });

  it.each([401, 422])(
    "does not retry when the backend rejects with status %i",
    async (status) => {
      const fetchMock = jest
        .fn<() => Promise<Response>>()
        .mockResolvedValue(errorResponse(status));
      global.fetch = fetchMock as unknown as typeof fetch;
      const onColdStartRetry = jest.fn();

      await expect(
        clientLogin(credentials, { onColdStartRetry, retryDelayMs: 0 })
      ).rejects.toMatchObject({ status });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(onColdStartRetry).not.toHaveBeenCalled();
    }
  );

  it("retries once and then rethrows the timeout when both attempts time out", async () => {
    const fetchMock = jest
      .fn<() => Promise<Response>>()
      .mockRejectedValue(timeoutRejection());
    global.fetch = fetchMock as unknown as typeof fetch;
    const onColdStartRetry = jest.fn();

    await expect(
      clientLogin(credentials, { onColdStartRetry, retryDelayMs: 0 })
    ).rejects.toMatchObject({ status: 504 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onColdStartRetry).toHaveBeenCalledTimes(1);
  });
});
