import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

async function requireAdmin() {
  const cookieStore = await cookies()
  const role = cookieStore.get('cosmart_role')?.value
  if (role !== 'admin') {
    return NextResponse.json({ data: null, error: '관리자만 접근 가능합니다' }, { status: 403 })
  }
  return null
}

// GET /api/group-buys/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('group_buys')
    .select(`*, products(*)`)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 404 })

  return NextResponse.json({ data, error: null })
}

// PATCH /api/group-buys/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  const body = await req.json()

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('group_buys')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

  return NextResponse.json({ data, error: null })
}

// DELETE /api/group-buys/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  const supabase = await createAdminClient()

  const { error } = await supabase.from('group_buys').delete().eq('id', id)
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

  return NextResponse.json({ data: { id }, error: null })
}
