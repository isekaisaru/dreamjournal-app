import { NextResponse, type NextRequest } from "next/server";

const API_PREFIX_PATTERN = /\/api\/v1\/?$/;

function normalizeBaseUrl(url: string): string {
  return url.replace(API_PREFIX_PATTERN, "");
}

function createMiddlewareApiUrl(
  request: NextRequest,
  endpoint: string
): string {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const internalApiUrl = process.env.INTERNAL_API_URL;

  if (internalApiUrl) {
    return `${normalizeBaseUrl(internalApiUrl)}${cleanEndpoint}`;
  }

  // Keep middleware self-contained for Edge/Turbopack by avoiding shared env helpers.
  return new URL(`/api${cleanEndpoint}`, request.url).toString();
}

export async function proxy(request: NextRequest) {
  // クロスドメイン環境ではCookieがVercel Edgeから見えないため、
  // 認証判定はClient側に委譲する（将来の同一ドメイン運用で復活可能）
  const authMode = process.env.NEXT_PUBLIC_AUTH_MODE;
  if (authMode === "client") {
    return NextResponse.next();
  }

  // E2Eテスト実行時は、認証チェックをバイパスして後続の処理に進む
  // 1) 環境変数 (PlaywrightがwebServer起動時に設定)
  // 2) クッキー __e2e__=1 （既存サーバー再利用時のためのフォールバック）
  const e2eByEnv = process.env.NEXT_PUBLIC_E2E === "1";
  const e2eByCookie = request.cookies.get("__e2e__")?.value === "1";
  if (e2eByEnv || e2eByCookie) {
    return NextResponse.next();
  }

  const token = request.cookies.get("access_token")?.value;

  const { pathname } = request.nextUrl;

  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/register");
  const isProtectedPage =
    pathname.startsWith("/home") ||
    pathname.startsWith("/dream") ||
    pathname.startsWith("/settings");

  if (!token && isProtectedPage) {
    // Let the page render its in-app login guidance instead of forcing an
    // immediate redirect. Protected data is still guarded by backend APIs.
    return NextResponse.next();
  }

  if (token) {
    try {
      const response = await fetch(createMiddlewareApiUrl(request, "/auth/verify"), {
        headers: {
          Cookie: `access_token=${token}`,
        },
      });

      if (response.ok && isAuthPage) {
        // Logged in, and on an auth page -> redirect to home
        return NextResponse.redirect(new URL("/home", request.url));
      } else if (!response.ok && isProtectedPage) {
        // Invalid token on a protected page: clear the stale cookie, then let
        // the client show the Morpheus login-required guidance.
        const res = NextResponse.next();
        res.cookies.delete("access_token");
        return res;
      }
    } catch (error) {
      console.error("Auth verification in middleware failed:", error);
    }
  }

  return NextResponse.next();
}

export const config = {
  // matcher にはミドルウェアを適用したいパスを指定
  matcher: [
    "/home/:path*",
    "/dream/:path*",
    "/settings/:path*",
    "/login",
    "/register",
  ],
};
