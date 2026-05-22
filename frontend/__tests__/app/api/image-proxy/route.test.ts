import { GET } from "@/app/api/image-proxy/route";

const fetchMock = jest.fn<typeof fetch>();
const originalResponse = global.Response;

const ALLOWED_URL =
  "https://oaidalleapiprodscus.blob.core.windows.net/private/img-test.png";

function makeRequest(url?: string): Request {
  const qs = url ? `?url=${encodeURIComponent(url)}` : "";
  return {
    url: `http://localhost/api/image-proxy${qs}`,
  } as unknown as Request;
}

class MockResponse {
  status: number;
  headers: { get: (key: string) => string | null };

  constructor(
    _body: unknown,
    init?: { status?: number; headers?: Record<string, string> }
  ) {
    this.status = init?.status ?? 200;
    const rawHeaders = init?.headers ?? {};
    // ヘッダー名を小文字化して正規化する
    const normalized = Object.fromEntries(
      Object.entries(rawHeaders).map(([k, v]) => [k.toLowerCase(), v])
    );
    this.headers = { get: (key: string) => normalized[key.toLowerCase()] ?? null };
  }
}

function makeImageResponse(contentType = "image/png"): Response {
  return {
    ok: true,
    headers: {
      get: (key: string) => (key === "content-type" ? contentType : null),
    },
    arrayBuffer: async () => new ArrayBuffer(8),
  } as unknown as Response;
}

describe("GET /api/image-proxy", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    global.Response = MockResponse as unknown as typeof Response;
  });

  afterAll(() => {
    global.Response = originalResponse;
  });

  describe("正常系", () => {
    it("許可ドメインのURLなら画像を取得して返す", async () => {
      fetchMock.mockResolvedValue(makeImageResponse());

      const res = await GET(makeRequest(ALLOWED_URL));

      expect(fetchMock).toHaveBeenCalledWith(
        ALLOWED_URL,
        expect.objectContaining({ headers: { Accept: "image/*" } })
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/png");
      expect(res.headers.get("cache-control")).toBe("private, max-age=300");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    });

    it("Content-Type が image/jpeg のときそのまま返す", async () => {
      fetchMock.mockResolvedValue(makeImageResponse("image/jpeg"));

      const res = await GET(makeRequest(ALLOWED_URL));

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/jpeg");
    });

    it("upstream の Content-Type が image/ 以外なら image/png にフォールバックする", async () => {
      fetchMock.mockResolvedValue(makeImageResponse("text/html"));

      const res = await GET(makeRequest(ALLOWED_URL));

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/png");
    });
  });

  describe("400: url パラメータ不正", () => {
    it("url パラメータが未指定なら 400", async () => {
      const res = await GET(makeRequest());
      expect(res.status).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("URLとしてパースできない文字列なら 400", async () => {
      const res = await GET(makeRequest("not a url at all"));
      expect(res.status).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("403: SSRF・許可外ドメイン拒否", () => {
    it("http URL なら 403", async () => {
      const res = await GET(
        makeRequest("http://oaidalleapiprodscus.blob.core.windows.net/img.png")
      );
      expect(res.status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("data: URL なら 403（https: ではないため）", async () => {
      const res = await GET(makeRequest("data:image/png;base64,abc"));
      expect(res.status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("localhost なら 403", async () => {
      const res = await GET(makeRequest("https://localhost/img.png"));
      expect(res.status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("127.0.0.1 なら 403", async () => {
      const res = await GET(makeRequest("https://127.0.0.1/img.png"));
      expect(res.status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("192.168.x.x なら 403", async () => {
      const res = await GET(makeRequest("https://192.168.1.1/img.png"));
      expect(res.status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("10.x.x.x なら 403", async () => {
      const res = await GET(makeRequest("https://10.0.0.1/img.png"));
      expect(res.status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("172.16.x.x（プライベートIP）なら 403", async () => {
      const res = await GET(makeRequest("https://172.16.0.1/img.png"));
      expect(res.status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("許可外のパブリックドメインなら 403", async () => {
      const res = await GET(makeRequest("https://evil.example.com/img.png"));
      expect(res.status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("許可ドメインをサブドメインに含む攻撃URLなら 403", async () => {
      const res = await GET(
        makeRequest(
          "https://oaidalleapiprodscus.blob.core.windows.net.evil.com/img.png"
        )
      );
      expect(res.status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("502: upstream エラー", () => {
    it("upstream の fetch が例外を投げたら 502", async () => {
      fetchMock.mockRejectedValue(new Error("network error"));

      const res = await GET(makeRequest(ALLOWED_URL));
      expect(res.status).toBe(502);
    });

    it("upstream が non-2xx を返したら 502", async () => {
      fetchMock.mockResolvedValue({ ok: false } as unknown as Response);

      const res = await GET(makeRequest(ALLOWED_URL));
      expect(res.status).toBe(502);
    });

    it("upstream がリダイレクトを返したら 502（redirect: error でSSRFバイパスを防ぐ）", async () => {
      // redirect: "error" のとき fetch はリダイレクトで TypeError を投げる
      fetchMock.mockRejectedValue(new TypeError("Failed to fetch: redirect"));

      const res = await GET(makeRequest(ALLOWED_URL));
      expect(res.status).toBe(502);
    });
  });

  describe("fetch オプションの検証", () => {
    it("redirect: error を指定して fetch を呼ぶ", async () => {
      fetchMock.mockResolvedValue(makeImageResponse());

      await GET(makeRequest(ALLOWED_URL));

      expect(fetchMock).toHaveBeenCalledWith(
        ALLOWED_URL,
        expect.objectContaining({ redirect: "error" })
      );
    });
  });
});
