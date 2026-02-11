import { NextRequest, NextResponse } from "next/server";

// Vercel本番環境ではどちらも未設定の場合、RenderのURLをフォールバックとして使用する
const BACKEND_URL =
  process.env.INTERNAL_BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://dreamjournal-app.onrender.com";

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

    const backendRes = await fetch(
      `${BACKEND_URL}/dreams/statuses?ids=${ids}`,
      {
        method: "GET",
        headers: {
          cookie: cookieHeader,
        },
      }
    );

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
