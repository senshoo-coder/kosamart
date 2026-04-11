import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'

async function requireAdmin() {
  const cookieStore = await cookies()
  return cookieStore.get('cosmart_role')?.value === 'admin'
}

// PATCH /api/admin/users/[id] — 상태 변경 또는 비밀번호 초기화
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ data: null, error: '권한 없음' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const { action, password } = body  // action: 'approve' | 'reject' | 'suspend' | 'reset_password'

  const supabase = await createAdminClient()

  if (action === 'approve') {
    const { data, error } = await supabase
      .from('users').update({ status: 'active' }).eq('id', id)
      .select('id, nickname, role, status').single()
    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    return NextResponse.json({ data, error: null })
  }

  if (action === 'reject') {
    const { data, error } = await supabase
      .from('users').update({ status: 'suspended' }).eq('id', id)
      .select('id, nickname, role, status').single()
    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    return NextResponse.json({ data, error: null })
  }

  if (action === 'suspend') {
    const { data, error } = await supabase
      .from('users').update({ status: 'suspended' }).eq('id', id)
      .select('id, nickname, role, status').single()
    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    return NextResponse.json({ data, error: null })
  }

  if (action === 'assign_store') {
    const { store_id } = body
    const { data, error } = await supabase
      .from('users').update({ store_id: store_id || null }).eq('id', id)
      .select('id, nickname, role, status, store_id').single()
    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    return NextResponse.json({ data, error: null })
  }

  if (action === 'reset_password') {
    if (!password || password.length < 6) return NextResponse.json({ data: null, error: '비밀번호 6자 이상' }, { status: 400 })
    const password_hash = await bcrypt.hash(password, 10)
    const { data, error } = await supabase
      .from('users').update({ password_hash }).eq('id', id)
      .select('id, nickname, role, status').single()
    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    return NextResponse.json({ data, error: null })
  }

  return NextResponse.json({ data: null, error: '유효하지 않은 액션' }, { status: 400 })
}

// DELETE /api/admin/users/[id] — 유저 삭제
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ data: null, error: '권한 없음' }, { status: 403 })

  const { id } = await params
  const supabase = await createAdminClient()

  const { error } = await supabase.from('users').delete().eq('id', id)
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

  return NextResponse.json({ data: { id }, error: null })
}
