import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyAdmin, notifyDriver } from '@/lib/telegram/messages'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const supabase = await createAdminClient()

  const updatePayload: Record<string, any> = {
    status: 'approved',
    approved_at: new Date().toISOString(),
  }
  if (body.owner_memo) updatePayload.owner_memo = body.owner_memo

  const { error: updateError } = await supabase
    .from('orders')
    .update(updatePayload)
    .eq('id', id)

  if (updateError) return NextResponse.json({ data: null, error: updateError.message }, { status: 500 })

  const { data: order } = await supabase.from('orders').select('*').eq('id', id).single()

  await notifyAdmin(`✅ [주문 승인] 주문ID: ${id} | ₩${order?.total_amount?.toLocaleString() ?? ''}`).catch(() => {})
  // 픽업 주문은 배달방 알림 제외
  if (order?.delivery_address !== '매장 픽업') {
    await notifyDriver(`🚚 배달 준비 요청: 주문ID ${id}\n주소: ${order?.delivery_address ?? ''}`).catch(() => {})
  }

  return NextResponse.json({ data: order ?? { id, status: 'approved' }, error: null })
}
