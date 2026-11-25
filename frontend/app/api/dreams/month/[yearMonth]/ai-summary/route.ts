import { resolveBackendUrl } from "@/app/api/checkout/backend-url";
import { forwardedOriginHeaders } from "@/app/api/checkout/request-origin";

export const runtime = "nodejs";

// Rails（MonthlySummariesController::YEAR_MONTH_FORMAT）と同じ形。
// yearMonth は Rails の URL にそのまま埋め込むため、「../../billing_portal?」のような値で
// 利用者の Cookie つきの POST を Rails の別の入口へ転送されないよう、ここで弾く。
const YEAR_MONTH_FORMAT = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ yearMonth: string }> }
) {
  const backendUrl = resolveBackendUrl();

  if (!backendUrl) {
    return Response.json({ error: "BACKEND_URL_NOT_SET" }, { status: 500 });
  }

  const { yearMonth } = await params;
  if (!YEAR_MONTH_FORMAT.test(yearMonth)) {
    return Response.json(
      { error: "年月の形式が正しくありません（YYYY-MM）。" },
      { status: 400 }
    );
  }

  const TIMEOUT_MS = 30_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(
      `${backendUrl}/dreams/month/${yearMonth}/ai_summary`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: req.headers.get("cookie") ?? "",
          // RailsのCSRF対策（Origin検証）を通すため、ブラウザが送ってきたOrigin/Refererを転送する
          ...forwardedOriginHeaders(req),
        },
        signal: controller.signal,
      }
    );

    const data = await upstream.json().catch(() => ({}));
    return Response.json(data, { status: upstream.status });
  } catch (e: unknown) {
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
