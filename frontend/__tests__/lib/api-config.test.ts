import { createApiUrl, getApiUrl } from "../../lib/api-config";

describe("api-config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.NEXT_PUBLIC_VERCEL;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("uses configured public API URL on the client", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com/api/v1/";

    expect(getApiUrl()).toBe("https://api.example.com");
    expect(createApiUrl("/auth/login")).toBe(
      "https://api.example.com/auth/login"
    );
  });

  it("uses the Render production URL as fallback when NEXT_PUBLIC_API_URL is unset", () => {
    process.env.NODE_ENV = "production";

    expect(createApiUrl("/auth/login")).toBe(
      "https://dreamjournal-app.onrender.com/auth/login"
    );
  });

  it("returns empty string for Vercel preview to avoid silently hitting production backend", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_VERCEL_ENV = "preview";

    expect(getApiUrl()).toBe("");
  });
});
