import { GET } from "@/app/api/auth/verify/route";

const originalEnv = process.env;
const originalResponse = global.Response;
const fetchMock = jest.fn();

describe("GET /api/auth/verify", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      INTERNAL_API_URL: "https://api.example.com",
    };
    fetchMock.mockReset();
    global.fetch = fetchMock;
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

  it("forwards the auth cookie to the backend verify endpoint", async () => {
    fetchMock.mockResolvedValue({
      status: 200,
      json: async () => ({ user: { id: 1 } }),
    });

    const response = await GET({
      headers: { get: () => "access_token=token-value" },
    } as unknown as Request);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/auth/verify",
      expect.objectContaining({
        method: "GET",
        headers: {
          Accept: "application/json",
          Cookie: "access_token=token-value",
        },
      })
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ user: { id: 1 } });
  });

  it("returns 500 when no backend URL can be resolved", async () => {
    process.env = { ...originalEnv, VERCEL: "1", VERCEL_ENV: "preview" };

    const response = await GET({
      headers: { get: () => null },
    } as unknown as Request);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "BACKEND_URL_NOT_SET",
    });
  });
});
