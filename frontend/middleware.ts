import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value

  const { pathname } = request.nextUrl

  // ログイン済みユーザーが /login や /register にアクセスしたら /home へリダイレクト
  if (token && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  // 未ログインユーザーが保護されたページにアクセスしたら /login へリダイレクト
  if (!token && (pathname.startsWith('/home') || pathname.startsWith('/dream') || pathname.startsWith('/settings'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // matcher にはミドルウェアを適用したいパスを指定
  matcher: ['/home/:path*', '/dream/:path*', '/settings/:path*', '/login', '/register'],
}
