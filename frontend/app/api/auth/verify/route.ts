import { resolveBackendUrl } from "../../checkout/backend-url";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const backendUrl = resolveBackendUrl();

  if (!backendUrl) {
    return Response.json({ error: "BACKEND_URL_NOT_SET" }, { status: 500 });
  }

  const TIMEOUT_MS = 15_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(`${backendUrl}/auth/verify`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Cookie: req.headers.get("cookie") ?? "",
      },
      signal: controller.signal,
    });

    const data = await upstream.json().catch(() => ({}));
    return Response.json(data, { status: upstream.status });
  } catch (e: any) {
    if ((e as Error)?.name === "AbortError") {
      return Response.json(
        { error: `Request timed out after ${TIMEOUT_MS / 1000}s` },
        { status: 504 }
      );
    }
    return Response.json({ error: "UPSTREAM_FETCH_FAILED" }, { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }
}
