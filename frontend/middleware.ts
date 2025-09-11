import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createApiUrl } from "./lib/api-config";

export async function middleware(request: NextRequest) {
  // E2Eテスト実行時は、認証チェックをバイパスして後続の処理に進む
  if (process.env.NEXT_PUBLIC_E2E === '1') {
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
    // No token, and trying to access a protected page -> redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token) {
    try {
      const response = await fetch(createApiUrl("/auth/verify"), {
        headers: {
          Cookie: `access_token=${token}`,
        },
      });

      if (response.ok && isAuthPage) {
        // Logged in, and on an auth page -> redirect to home
        return NextResponse.redirect(new URL("/home", request.url));
      } else if (!response.ok && isProtectedPage) {
        // Invalid token, and on a protected page -> redirect to login and clear the bad cookie
        const res = NextResponse.redirect(new URL("/login", request.url));
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
