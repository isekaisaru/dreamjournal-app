import { POST } from "@/app/api/checkout/route";

// 退行防止テスト: Next.jsルートハンドラ→Railsへのサーバー間fetchで
// ブラウザのOrigin/Refererが失われ、RailsのCSRF対策（Origin検証）に
// 弾かれて本番のcheckoutが壊れていた問題（Codexレビューで指摘）への回帰テスト。
const originalEnv = process.env;
const originalResponse = global.Response;
const fetchMock = jest.fn<typeof fetch>();

describe("POST /api/checkout", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, INTERNAL_API_URL: "https://api.example.com" };
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    global.Response = {
      json: (body: unknown, init?: ResponseInit) =>
        ({
          status: init?.status ?? 200,
          json: async () => body,
        }) as Response,
    } as typeof Response;
  });

  afterAll(() => {
    process.env = originalEnv;
    global.Response = originalResponse;
  });

  const makeRequest = (headers: Record<string, string | null>) =>
    ({
      headers: { get: (key: string) => headers[key.toLowerCase()] ?? null },
      text: async () => "{}",
      json: async () => ({}),
    }) as unknown as Request;

  it("ブラウザのOriginをRailsへのリクエストに転送する", async () => {
    fetchMock.mockResolvedValue({
      status: 200,
      json: async () => ({ url: "https://checkout.stripe.com/xxx" }),
    } as unknown as Response);

    await POST(
      makeRequest({
        cookie: "access_token=token-value",
        origin: "https://dreamjournal-app.vercel.app",
      })
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/checkout",
      expect.objectContaining({
        headers: expect.objectContaining({
          Origin: "https://dreamjournal-app.vercel.app",
        }),
      })
    );
  });

  it("Originが無くRefererのみの場合はRefererを転送する", async () => {
    fetchMock.mockResolvedValue({
      status: 200,
      json: async () => ({}),
    } as unknown as Response);

    await POST(
      makeRequest({
        cookie: "access_token=token-value",
        referer: "https://dreamjournal-app.vercel.app/subscription",
      })
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/checkout",
      expect.objectContaining({
        headers: expect.objectContaining({
          Referer: "https://dreamjournal-app.vercel.app/subscription",
        }),
      })
    );
  });
});
