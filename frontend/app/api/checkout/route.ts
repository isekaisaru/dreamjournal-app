// Sentry OpenTelemetry との互換性のため、Node.js Runtime を使用
export const runtime = "nodejs";

const DEFAULT_PUBLIC_BACKEND_URL = "https://dreamjournal-app.onrender.com";

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function isPrivateRuntimeHost(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return ["backend", "localhost", "127.0.0.1"].includes(hostname);
  } catch {
    return true;
  }
}

function resolveBackendUrl(): string | null {
  const internalApiUrl = process.env.INTERNAL_API_URL;
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isVercelRuntime = process.env.VERCEL === "1";

  const candidates = isVercelRuntime
    ? [publicApiUrl, internalApiUrl, DEFAULT_PUBLIC_BACKEND_URL]
    : [internalApiUrl, publicApiUrl, DEFAULT_PUBLIC_BACKEND_URL];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (isVercelRuntime && isPrivateRuntimeHost(candidate)) continue;
    return normalizeBaseUrl(candidate);
  }

  return null;
}

export async function POST(req: Request) {
  const backendUrl = resolveBackendUrl();

  if (!backendUrl) {
    return Response.json({ error: "BACKEND_URL_NOT_SET" }, { status: 500 });
  }

  // 15秒タイムアウト（Renderコールドスタート対策）
  const TIMEOUT_MS = 15_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(`${backendUrl}/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // JWT認証のためCookieをバックエンドへ転送する（checkout はログイン必須）
        Cookie: req.headers.get("cookie") ?? "",
      },
      signal: controller.signal,
    });

    const data = await upstream.json().catch(() => ({}));
    return Response.json(data, { status: upstream.status });
  } catch (e: any) {
    if ((e as Error)?.name === "AbortError") {
      return Response.json(
        { error: `Checkout request timed out after ${TIMEOUT_MS / 1000}s` },
        { status: 504 }
      );
    }
    return Response.json({ error: "UPSTREAM_FETCH_FAILED" }, { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }
}
