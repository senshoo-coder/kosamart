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

// PATCH /api/products/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  const body = await req.json()

  if (body.price != null && body.price < 0) {
    return NextResponse.json({ data: null, error: '가격은 0 이상이어야 합니다' }, { status: 400 })
  }
  if (body.stock_limit != null && body.stock_limit < 0) {
    return NextResponse.json({ data: null, error: '재고는 0 이상이어야 합니다' }, { status: 400 })
  }

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('products')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

  return NextResponse.json({ data, error: null })
}

// DELETE /api/products/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  const supabase = await createAdminClient()

  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

  return NextResponse.json({ data: { id }, error: null })
}
