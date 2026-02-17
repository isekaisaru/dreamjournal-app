// Sentry OpenTelemetry との互換性のため、Node.js Runtime を使用
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const backendUrl =
    process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL;

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
        // 認証が必要になったら、cookieを転送する（今は不要ならこのままでOK）
        // Cookie: req.headers.get("cookie") ?? "",
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
