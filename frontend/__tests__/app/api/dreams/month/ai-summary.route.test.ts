import { POST } from "@/app/api/dreams/month/[yearMonth]/ai-summary/route";

// yearMonth は URL の一部をそのまま Rails の URL に埋め込んでいた。
// 「../../billing_portal?」のような値だと、Rails の別の入口へ
// 利用者の Cookie つきで POST を転送できてしまうため、
// Rails と同じ YYYY-MM の形だけを通し、それ以外は Rails に送らずに 400 で返す。
const originalEnv = process.env;
const originalResponse = global.Response;
const fetchMock = jest.fn<typeof fetch>();

const makeRequest = () =>
  ({
    headers: { get: (key: string) => (key === "cookie" ? "access_token=abc" : null) },
  }) as unknown as Request;

const call = (yearMonth: string) =>
  POST(makeRequest(), { params: Promise.resolve({ yearMonth }) });

describe("POST /api/dreams/month/[yearMonth]/ai-summary", () => {
  beforeEach(() => {
    process.env = { ...originalEnv, INTERNAL_API_URL: "https://api.example.com" };
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    global.Response = {
      json: (body: unknown, init?: ResponseInit) =>
        ({ status: init?.status ?? 200, json: async () => body }) as Response,
    } as typeof Response;
  });

  afterAll(() => {
    process.env = originalEnv;
    global.Response = originalResponse;
  });

  it("YYYY-MM の形なら Rails へ転送する", async () => {
    fetchMock.mockResolvedValue({
      status: 200,
      json: async () => ({ summary: "ok" }),
    } as Response);

    const res = await call("2026-11");

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/dreams/month/2026-11/ai_summary",
      expect.objectContaining({ method: "POST" })
    );
  });

  it.each([
    ["別の入口へ移ろうとする", "../../billing_portal?"],
    ["月が 13", "2026-13"],
    ["月が 1 けた", "2026-1"],
    ["文字がまじる", "2026-11x"],
  ])("%s ときは Rails に送らず 400 を返す", async (_label, yearMonth) => {
    const res = await call(yearMonth);

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
