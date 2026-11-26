/**
 * @jest-environment node
 */
import type { NextRequest } from "next/server";

// /api/dreams/statuses は ids をそのまま Rails の URL に埋め込んでいた。
// 「1&foo=bar」のような値で、Rails へ余計なパラメーターを足せてしまうため、
// 数字のカンマ区切りだけを通し、形がおかしい値は Rails に送らずに 400 で返す。
const originalEnv = process.env;
const fetchMock = jest.fn<typeof fetch>();

function loadGET() {
  let GET!: (req: NextRequest) => Promise<Response>;
  jest.isolateModules(() => {
    ({ GET } = require("@/app/api/dreams/statuses/route"));
  });
  return GET;
}

function makeRequest(query: string): NextRequest {
  return new Request(`http://localhost/api/dreams/statuses${query}`, {
    headers: { cookie: "access_token=abc" },
  }) as unknown as NextRequest;
}

describe("GET /api/dreams/statuses", () => {
  beforeEach(() => {
    process.env = { ...originalEnv, INTERNAL_API_URL: "https://api.example.com" };
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("数字のカンマ区切りなら Rails へそのまま問い合わせる", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ "1": "done" }), { status: 200 })
    );
    const GET = loadGET();

    const res = await GET(makeRequest("?ids=1,22,333&t=123"));

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "https://api.example.com/dreams/statuses?ids=1,22,333"
    );
  });

  it.each([
    ["& で別のパラメーターを足そうとする", "?ids=1%26user_id%3D2"],
    ["数字以外がまじる", "?ids=1,abc"],
    ["空の要素がある", "?ids=1,,2"],
  ])("%s ときは Rails に送らず 400 を返す", async (_label, query) => {
    const GET = loadGET();

    const res = await GET(makeRequest(query));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("一度に問い合わせる数が多すぎるときは Rails に送らず 400 を返す", async () => {
    const GET = loadGET();
    const ids = Array.from({ length: 101 }, (_, i) => i + 1).join(",");

    const res = await GET(makeRequest(`?ids=${ids}`));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
