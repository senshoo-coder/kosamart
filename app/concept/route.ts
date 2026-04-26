import { NextRequest, NextResponse } from 'next/server'
import { CONCEPT_PAPER_HTML } from '@/lib/content/concept-paper'

export async function GET(req: NextRequest) {
  const access = req.cookies.get('concept_access')?.value
  if (access !== 'granted') {
    return NextResponse.redirect(new URL('/concept-login', req.url))
  }
  return new NextResponse(CONCEPT_PAPER_HTML, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  })
}
