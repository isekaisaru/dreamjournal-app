import { NextRequest, NextResponse } from "next/server";
import { resolveBackendUrl } from "../../checkout/backend-url";

const BACKEND_URL = resolveBackendUrl();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ids = searchParams.get("ids");

  if (!ids) {
    return NextResponse.json(
      { error: "ids parameter is required" },
      { status: 400 }
    );
  }

  if (!BACKEND_URL) {
    return NextResponse.json(
      { error: "Backend URL is not configured." },
      { status: 500 }
    );
  }

  try {
    const cookieHeader = req.headers.get("cookie") ?? "";
    console.log(
      `[API Proxy] /dreams/statuses req cookies present: ${!!cookieHeader}`
    );

    // Renderコールドスタート対策: 15秒でタイムアウト
    const TIMEOUT_MS = 15_000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let backendRes: Response;
    try {
      backendRes = await fetch(`${BACKEND_URL}/dreams/statuses?ids=${ids}`, {
        method: "GET",
        headers: {
          cookie: cookieHeader,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if ((fetchError as Error)?.name === "AbortError") {
        return NextResponse.json(
          { error: "Backend request timed out. Please retry." },
          { status: 504 }
        );
      }
      throw fetchError;
    }

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: `Backend error: ${backendRes.status}` },
        { status: backendRes.status }
      );
    }

    const data = await backendRes.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch dream statuses:", error);
    return NextResponse.json(
      { error: "Failed to fetch status data" },
      { status: 500 }
    );
  }
}
