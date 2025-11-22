import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // 開発環境ではスキップ
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next()
  }

  // Basic認証用の環境変数
  const basicAuth = request.headers.get('authorization')
  const url = request.nextUrl

  // 認証が必要な場合
  if (process.env.MAINTENANCE_MODE === 'true') {
    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1]
      const [user, pwd] = atob(authValue).split(':')

      const validUser = process.env.BASIC_AUTH_USER || 'admin'
      const validPassword = process.env.BASIC_AUTH_PASSWORD || 'password'

      if (user === validUser && pwd === validPassword) {
        return NextResponse.next()
      }
    }

    url.pathname = '/api/auth/basic'

    return NextResponse.rewrite(url, {
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Area"',
      },
      status: 401,
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/((?!api/auth/basic|_next/static|_next/image|favicon.ico).*)',
}
