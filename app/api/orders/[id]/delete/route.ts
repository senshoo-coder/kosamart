import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'

// POST /api/orders/[id]/delete — 관리자 전용 주문 완전 삭제
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const role = cookieStore.get('cosmart_role')?.value
  if (role !== 'admin') {
    return NextResponse.json({ error: '관리자만 삭제할 수 있습니다' }, { status: 403 })
  }

  const { id } = await params
  const supabase = await createAdminClient()

  // FK 순서대로 삭제
  try { await supabase.from('order_status_logs').delete().eq('order_id', id) } catch {}
  try { await supabase.from('deliveries').delete().eq('order_id', id) } catch {}
  try { await supabase.from('order_items').delete().eq('order_id', id) } catch {}

  const { error } = await supabase.from('orders').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: { id, deleted: true }, error: null })
}
