import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const DEFAULT_PASSWORD = 'kosamart2026'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const password = body.password || ''

  const valid = process.env.CONCEPT_PAGE_PASSWORD || DEFAULT_PASSWORD
  if (password !== valid) {
    return NextResponse.json({ ok: false, error: '비밀번호가 올바르지 않습니다' }, { status: 401 })
  }

  const cookieStore = await cookies()
  cookieStore.set('concept_access', 'granted', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7일
    path: '/',
  })

  return NextResponse.json({ ok: true })
}
