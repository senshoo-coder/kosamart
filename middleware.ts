import { NextResponse, type NextRequest } from 'next/server'

// 컨셉 페이퍼는 비밀번호 인증 후에만 접근 가능
export function middleware(req: NextRequest) {
  const url = req.nextUrl.pathname
  if (url === '/concept.html') {
    const access = req.cookies.get('concept_access')?.value
    if (access !== 'granted') {
      const loginUrl = new URL('/concept-login', req.url)
      return NextResponse.redirect(loginUrl)
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/concept.html'],
}
