import { NextRequest } from 'next/server'
import { CONCEPT_PAPER_HTML } from '@/lib/content/concept-paper'

export async function GET(req: NextRequest) {
  const access = req.cookies.get('concept_access')?.value
  if (access !== 'granted') {
    // 상대 경로 리다이렉트 — Railway 프록시 뒤에서도 호스트가 깨지지 않음
    return new Response(null, {
      status: 307,
      headers: { Location: '/concept-login' },
    })
  }
  return new Response(CONCEPT_PAPER_HTML, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  })
}
