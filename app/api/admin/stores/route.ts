import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url?.startsWith('https') || !key) return null
  return createSupabaseClient(url, key)
}

async function requireAdmin() {
  const cookieStore = await cookies()
  return cookieStore.get('cosmart_role')?.value === 'admin'
}

// GET /api/admin/stores — store_settings 목록
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ data: null, error: '권한 없음' }, { status: 403 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ data: [], error: null })
  }

  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .order('name')

    if (error) {
      console.error('store_settings query error:', error.message)
      return NextResponse.json({ data: [], error: null })
    }
    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: [], error: null })
  }
}

// PUT /api/admin/stores — is_active 토글
export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'DB 연결 실패' }, { status: 500 })
  }

  try {
    const { store_id, is_active } = await req.json()
    if (!store_id || typeof is_active !== 'boolean') {
      return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
    }

    // upsert: store_settings 행이 없으면 생성, 있으면 업데이트
    const { error } = await supabase
      .from('store_settings')
      .upsert({ store_id, is_active, updated_at: new Date().toISOString() }, { onConflict: 'store_id' })

    if (error) {
      console.error('store_settings upsert error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: { store_id, is_active }, error: null })
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// GET /api/admin/stores/active — 고객용 활성 가게 목록 (인증 불필요)
export async function HEAD(req: NextRequest) {
  return NextResponse.json({})
}
