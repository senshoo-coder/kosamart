import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

// 컨셉 페이퍼 HTML을 모듈 로드 시점에 읽어서 캐시
const HTML = readFileSync(join(process.cwd(), 'lib', 'content', 'concept-paper.html'), 'utf-8')

export async function GET(req: NextRequest) {
  const access = req.cookies.get('concept_access')?.value
  if (access !== 'granted') {
    return NextResponse.redirect(new URL('/concept-login', req.url))
  }
  return new NextResponse(HTML, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  })
}
