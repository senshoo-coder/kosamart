import { NextResponse, type NextRequest } from 'next/server'

// 옛 경로 (/concept.html)는 새 경로로 리다이렉트
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === '/concept.html') {
    return NextResponse.redirect(new URL('/concept', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/concept.html'],
}
