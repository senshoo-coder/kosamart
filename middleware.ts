import { NextRequest, NextResponse } from 'next/server'

const ROLE_ROUTES: Record<string, string[]> = {
  owner:  ['/owner'],
  driver: ['/driver'],
  admin:  ['/admin'],
}

// 로그인 없이 접근 가능한 경로
const PUBLIC_PATHS = ['/login', '/register', '/api/auth', '/market/privacy']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 프로덕션에서 /test 및 /api/auth/demo 차단
  if (process.env.NODE_ENV === 'production') {
    if (pathname === '/test' || pathname.startsWith('/api/auth/demo')) {
      return NextResponse.rewrite(new URL('/login', req.url))
    }
  }

  // 정적 파일, API(auth 제외), _next 등 패스
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') ||
    PUBLIC_PATHS.some(p => pathname.startsWith(p))
  ) {
    return NextResponse.next()
  }

  const userId = req.cookies.get('cosmart_user_id')?.value
  const role = req.cookies.get('cosmart_role')?.value

  // 미로그인 상태에서 보호 경로 접근 시 로그인 페이지로
  const isProtected = Object.values(ROLE_ROUTES).flat().some(p => pathname.startsWith(p))
  if (isProtected && !userId) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 역할 불일치 접근 차단
  for (const [requiredRole, prefixes] of Object.entries(ROLE_ROUTES)) {
    if (prefixes.some(p => pathname.startsWith(p))) {
      if (role !== requiredRole && role !== 'admin') {
        return NextResponse.redirect(new URL('/login', req.url))
      }
      break
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
