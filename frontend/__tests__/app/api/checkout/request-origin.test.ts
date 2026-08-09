import { forwardedOriginHeaders } from "@/app/api/checkout/request-origin";

describe("forwardedOriginHeaders", () => {
  const makeRequest = (headers: Record<string, string | null>) =>
    ({
      headers: { get: (key: string) => headers[key.toLowerCase()] ?? null },
    }) as unknown as Request;

  it("Originがあればそのまま転送する", () => {
    const req = makeRequest({ origin: "https://dreamjournal-app.vercel.app" });

    expect(forwardedOriginHeaders(req)).toEqual({
      Origin: "https://dreamjournal-app.vercel.app",
    });
  });

  it("Refererがあればそのまま転送する", () => {
    const req = makeRequest({
      referer: "https://dreamjournal-app.vercel.app/subscription",
    });

    expect(forwardedOriginHeaders(req)).toEqual({
      Referer: "https://dreamjournal-app.vercel.app/subscription",
    });
  });

  it("両方あれば両方転送する", () => {
    const req = makeRequest({
      origin: "https://dreamjournal-app.vercel.app",
      referer: "https://dreamjournal-app.vercel.app/subscription",
    });

    expect(forwardedOriginHeaders(req)).toEqual({
      Origin: "https://dreamjournal-app.vercel.app",
      Referer: "https://dreamjournal-app.vercel.app/subscription",
    });
  });

  it("偽装されたOrigin/Refererでもそのまま転送する（検証はRails側の責務）", () => {
    const req = makeRequest({ origin: "https://evil.example.com" });

    expect(forwardedOriginHeaders(req)).toEqual({
      Origin: "https://evil.example.com",
    });
  });

  it("どちらも無ければ空オブジェクトを返す", () => {
    const req = makeRequest({});

    expect(forwardedOriginHeaders(req)).toEqual({});
  });
});
