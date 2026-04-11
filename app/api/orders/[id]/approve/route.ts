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

  const { data: order } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', id)
    .single()

  const items = (order?.order_items ?? [])
    .map((i: any) => `• ${i.product_name} x${i.quantity} (₩${i.subtotal?.toLocaleString()})`)
    .join('\n')

  const isPickup = order?.delivery_address === '매장 픽업'

  const msg = [
    `✅ <b>[주문 승인]</b>`,
    ``,
    `주문번호: <code>${order?.order_number ?? id}</code>`,
    `주문자: <b>${order?.kakao_nickname ?? '-'}</b>`,
    `전화번호: ${order?.customer_phone ?? '-'}`,
    `매장: ${order?.store_name ?? '-'}`,
    `유형: ${isPickup ? '🏪 매장 픽업' : '🚚 배송'}`,
    !isPickup ? `주소: ${order?.delivery_address}` : null,
    order?.delivery_memo ? `메모: ${order?.delivery_memo}` : null,
    `금액: <b>₩${order?.total_amount?.toLocaleString() ?? ''}</b>`,
    ``,
    items ? `상품:\n${items}` : null,
  ].filter(Boolean).join('\n')

  await notifyAdmin(msg).catch(() => {})

  if (!isPickup) {
    await notifyDriver(`🚚 배달 준비 요청: ${order?.kakao_nickname}\n📍 ${order?.delivery_address ?? ''}\n📞 ${order?.customer_phone ?? '-'}`).catch(() => {})
  }

  return NextResponse.json({ data: order ?? { id, status: 'approved' }, error: null })
}
