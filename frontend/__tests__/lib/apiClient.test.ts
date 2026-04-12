import { apiFetch } from "../../lib/apiClient";

describe("apiFetch timeout policy", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.spyOn(global, "setTimeout");
    global.fetch = jest.fn().mockRejectedValue(new Error("network down")) as typeof fetch;
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
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: jest.fn().mockRejectedValue(new Error("invalid json")),
      text: jest.fn().mockResolvedValue("upstream connect error or disconnect/reset before headers"),
    } as unknown as Response) as typeof fetch;

    await expect(apiFetch("/dreams")).rejects.toThrow(
      "upstream connect error or disconnect/reset before headers"
    );
  });
});
