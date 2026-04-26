import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ROLE_HOME: Record<string, string> = {
  customer: '/market',
  owner:    '/owner/dashboard',
  driver:   '/driver/deliveries',
  admin:    '/admin/dashboard',
}

const ROLE_PATHS: Record<string, string[]> = {
  customer: ['/shop', '/market', '/orders', '/profile'],
  owner:    ['/owner'],
  driver:   ['/driver'],
  admin:    ['/admin'],
}

const MODE_CONFIG: Record<string, { allowedRoles: string[]; loginRole: string; home: string }> = {
  customer: { allowedRoles: ['customer'], loginRole: 'customer', home: '/market' },
  owner:    { allowedRoles: ['owner'],    loginRole: 'owner',    home: '/owner/dashboard' },
  driver:   { allowedRoles: ['driver'],   loginRole: 'driver',   home: '/driver/deliveries' },
  admin:    { allowedRoles: ['admin'],    loginRole: 'admin',    home: '/admin/dashboard' },
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 옛 컨셉 페이퍼 URL 리다이렉트
  if (pathname === '/concept.html') {
    return NextResponse.redirect(new URL('/concept', request.url))
  }

  // 프로덕션에서 개발 전용 경로 차단
  if (process.env.NODE_ENV === 'production') {
    if (pathname === '/test' || pathname.startsWith('/api/auth/demo')) {
      return NextResponse.rewrite(new URL('/login', request.url))
    }
  }
  const role = request.cookies.get('cosmart_role')?.value
  const userId = request.cookies.get('cosmart_user_id')?.value
  const isLoggedIn = !!userId && !!role

  const appMode = process.env.NEXT_PUBLIC_APP_MODE
  const modeConfig = appMode ? MODE_CONFIG[appMode] : null

  // 앱 모드 설정된 경우
  if (modeConfig) {
    if (pathname === '/' || pathname === '/login' || pathname === '/register') {
      if (isLoggedIn && modeConfig.allowedRoles.includes(role!)) {
        return NextResponse.redirect(new URL(modeConfig.home, request.url))
      }
      if (isLoggedIn && !modeConfig.allowedRoles.includes(role!)) {
        const res = NextResponse.redirect(new URL(`/login?role=${modeConfig.loginRole}`, request.url))
        res.cookies.delete('cosmart_user_id')
        res.cookies.delete('cosmart_role')
        return res
      }
      return NextResponse.next()
    }

    const isProtected = Object.values(ROLE_PATHS).flat().some(p => pathname.startsWith(p))
    if (isProtected) {
      if (!isLoggedIn) {
        return NextResponse.redirect(new URL(`/login?role=${modeConfig.loginRole}&redirect=${pathname}`, request.url))
      }
      if (!modeConfig.allowedRoles.includes(role!)) {
        const res = NextResponse.redirect(new URL(`/login?role=${modeConfig.loginRole}`, request.url))
        res.cookies.delete('cosmart_user_id')
        res.cookies.delete('cosmart_role')
        return res
      }
      const allowedPaths = modeConfig.allowedRoles.flatMap(r => ROLE_PATHS[r] ?? [])
      if (!allowedPaths.some(p => pathname.startsWith(p))) {
        return NextResponse.redirect(new URL(modeConfig.home, request.url))
      }
    }
    return NextResponse.next()
  }

  // 앱 모드 미설정 (통합 앱)
  if (pathname === '/' || pathname === '/login' || pathname === '/register') {
    if (isLoggedIn && role && ROLE_HOME[role]) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], request.url))
    }
    return NextResponse.next()
  }

  const allProtectedPaths = Object.values(ROLE_PATHS).flat()
  if (allProtectedPaths.some(p => pathname.startsWith(p))) {
    if (!isLoggedIn) {
      const loginUrl = new URL('/login', request.url)
      if (pathname.startsWith('/owner')) loginUrl.searchParams.set('role', 'owner')
      else if (pathname.startsWith('/admin')) loginUrl.searchParams.set('role', 'admin')
      else if (pathname.startsWith('/driver')) loginUrl.searchParams.set('role', 'driver')
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    const allowedPaths = ROLE_PATHS[role!] ?? []
    if (!allowedPaths.some(p => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL(ROLE_HOME[role!] ?? '/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/register',
    '/concept.html',
    '/shop/:path*',
    '/market/:path*',
    '/orders/:path*',
    '/profile/:path*',
    '/owner/:path*',
    '/driver/:path*',
    '/admin/:path*',
  ],
}
