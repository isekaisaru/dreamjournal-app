import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { resolveBackendUrl } from "@/app/api/checkout/backend-url";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const redirectTo = req.nextUrl.searchParams.get("redirect") ?? "/home";

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const backendUrl = resolveBackendUrl();
  if (!backendUrl) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const upstream = await fetch(`${backendUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        Cookie: `refresh_token=${refreshToken}`,
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Forward Set-Cookie headers from Rails to the browser
    const response = NextResponse.redirect(new URL(redirectTo, req.url));
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        response.headers.append("Set-Cookie", value);
      }
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}
