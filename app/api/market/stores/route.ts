import { NextResponse } from 'next/server'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// GET /api/market/stores — 고객용 활성 가게 설정 조회
export async function GET() {
  if (!SUPA_URL.startsWith('https') || !SUPA_KEY) {
    return NextResponse.json({ data: null, error: null })
  }
  try {
    const res = await fetch(`${SUPA_URL}/storage/v1/object/authenticated/config/store-settings.json`, {
      headers: { Authorization: `Bearer ${SUPA_KEY}`, apikey: SUPA_KEY },
      next: { revalidate: 30 }, // 30초 캐시
    })
    if (!res.ok) return NextResponse.json({ data: null, error: null })
    const settings: Record<string, boolean> = await res.json()
    const data = Object.entries(settings).map(([store_id, is_active]) => ({ store_id, is_active }))
    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: null, error: null })
  }
}
