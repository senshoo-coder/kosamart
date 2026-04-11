import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const BUCKET = 'config'
const FILE = 'store-settings.json'

function getSupabase() {
  if (!SUPA_URL.startsWith('https') || !SUPA_KEY) return null
  return createSupabaseClient(SUPA_URL, SUPA_KEY)
}

async function requireAdmin() {
  const cookieStore = await cookies()
  return cookieStore.get('cosmart_role')?.value === 'admin'
}

async function readSettings(): Promise<Record<string, boolean>> {
  try {
    const res = await fetch(`${SUPA_URL}/storage/v1/object/authenticated/${BUCKET}/${FILE}`, {
      headers: { Authorization: `Bearer ${SUPA_KEY}`, apikey: SUPA_KEY },
    })
    if (!res.ok) return {}
    return await res.json()
  } catch {
    return {}
  }
}

async function writeSettings(data: Record<string, boolean>) {
  await fetch(`${SUPA_URL}/storage/v1/object/${BUCKET}/${FILE}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${SUPA_KEY}`,
      apikey: SUPA_KEY,
      'Content-Type': 'application/json',
      'x-upsert': 'true',
    },
    body: JSON.stringify(data),
  })
}

// GET /api/admin/stores — 가게 활성화 설정 목록
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ data: null, error: '권한 없음' }, { status: 403 })
  }
  const settings = await readSettings()
  // data 배열 형식으로 반환 (기존 페이지 호환)
  const data = Object.entries(settings).map(([store_id, is_active]) => ({ store_id, is_active }))
  return NextResponse.json({ data, error: null })
}

// PUT /api/admin/stores — is_active 토글
export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }
  try {
    const { store_id, is_active } = await req.json()
    if (!store_id || typeof is_active !== 'boolean') {
      return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
    }
    const current = await readSettings()
    current[store_id] = is_active
    await writeSettings(current)
    return NextResponse.json({ data: { store_id, is_active }, error: null })
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
