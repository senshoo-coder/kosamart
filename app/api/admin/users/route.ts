import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'

async function requireAdmin() {
  const cookieStore = await cookies()
  const role = cookieStore.get('cosmart_role')?.value
  if (role !== 'admin') return false
  return true
}

// GET /api/admin/users — 유저 목록
export async function GET(req: NextRequest) {
  if (!await requireAdmin()) {
    return NextResponse.json({ data: null, error: '권한이 없습니다' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const role = searchParams.get('role')

  const supabase = await createAdminClient()

  let query = supabase
    .from('users')
    .select('id, nickname, role, status, phone, store_id, telegram_chat_id, created_at')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (role) query = query.eq('role', role)

  const { data, error } = await query
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

  return NextResponse.json({ data, error: null })
}

// POST /api/admin/users — 관리자가 직접 유저 생성
export async function POST(req: NextRequest) {
  if (!await requireAdmin()) {
    return NextResponse.json({ data: null, error: '권한이 없습니다' }, { status: 403 })
  }

  const body = await req.json()
  const { nickname, password, role, phone, store_id } = body

  if (!nickname?.trim()) return NextResponse.json({ data: null, error: '닉네임 필요' }, { status: 400 })
  if (!password || password.length < 6) return NextResponse.json({ data: null, error: '비밀번호 6자 이상' }, { status: 400 })
  if (!['customer', 'owner', 'driver', 'admin'].includes(role)) {
    return NextResponse.json({ data: null, error: '유효하지 않은 역할' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  const { data: existing } = await supabase.from('users').select('id').eq('nickname', nickname.trim()).single()
  if (existing) return NextResponse.json({ data: null, error: '이미 사용 중인 닉네임' }, { status: 409 })

  const password_hash = await bcrypt.hash(password, 10)

  const { data: user, error } = await supabase
    .from('users')
    .insert({
      nickname: nickname.trim(),
      password_hash,
      role,
      status: 'active',
      phone: phone?.trim() || null,
      store_id: role === 'owner' ? (store_id || null) : null,
    })
    .select('id, nickname, role, status, phone, store_id, created_at')
    .single()

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

  return NextResponse.json({ data: user, error: null })
}
