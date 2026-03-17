import { resolveBackendUrlFromEnv } from "@/app/api/checkout/backend-url";

describe("resolveBackendUrlFromEnv", () => {
  it("uses the configured public backend on Vercel", () => {
    expect(
      resolveBackendUrlFromEnv({
        VERCEL: "1",
        VERCEL_ENV: "production",
        NEXT_PUBLIC_API_URL: "https://api.example.com/",
        INTERNAL_API_URL: "http://backend:3001",
      })
    ).toBe("https://api.example.com");
  });

  it("falls back to the Render backend only on Vercel production", () => {
    expect(
      resolveBackendUrlFromEnv({
        VERCEL: "1",
        VERCEL_ENV: "production",
        INTERNAL_API_URL: "http://backend:3001",
      })
    ).toBe("https://dreamjournal-app.onrender.com");
  });

  it("fails fast on Vercel preview when only private hosts are available", () => {
    expect(
      resolveBackendUrlFromEnv({
        VERCEL: "1",
        VERCEL_ENV: "preview",
        INTERNAL_API_URL: "http://backend:3001",
      })
    ).toBeNull();
  });

  it("keeps using the internal backend outside Vercel", () => {
    expect(
      resolveBackendUrlFromEnv({
        INTERNAL_API_URL: "http://backend:3001/",
        NEXT_PUBLIC_API_URL: "https://api.example.com",
      })
    ).toBe("http://backend:3001");
  });
});
