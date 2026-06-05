import { apiFetch } from "../../lib/apiClient";

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
