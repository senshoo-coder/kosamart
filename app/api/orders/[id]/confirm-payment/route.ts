import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyAdmin, notifyDriver } from '@/lib/telegram/messages'

// POST /api/orders/[id]/confirm-payment
// 입금확인 + 자동 승인 (pending → approved 한 번에)
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createAdminClient()

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', id)
    .in('status', ['pending', 'paid']) // 혹시 paid 상태도 처리 가능하도록

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
    isPickup ? `✅ <b>[입금확인 · 고객 픽업 승인]</b>` : `✅ <b>[입금확인 · 배달 준비]</b>`,
    ``,
    `주문번호: <code>${order?.order_number ?? id}</code>`,
    `주문자: <b>${order?.kakao_nickname ?? '-'}</b>`,
    `전화번호: ${order?.customer_phone ?? '-'}`,
    `매장: ${order?.store_name ?? '-'}`,
    `유형: ${isPickup ? '🏪 매장 픽업' : '🚚 배달'}`,
    !isPickup ? `주소: ${order?.delivery_address}` : null,
    order?.delivery_memo ? `메모: ${order?.delivery_memo}` : null,
    `금액: <b>₩${order?.total_amount?.toLocaleString() ?? ''}</b>`,
    ``,
    items ? `상품:\n${items}` : null,
    ``,
    isPickup ? `→ 준비완료 후 고객 픽업을 기다려 주세요 🏪` : `→ 배달팀에 배정 요청이 전달되었습니다 🚚`,
  ].filter(Boolean).join('\n')

  await notifyAdmin(msg).catch(() => {})

  if (!isPickup) {
    await notifyDriver(`🚚 배달 준비 요청: ${order?.kakao_nickname}\n📍 ${order?.delivery_address ?? ''}\n📞 ${order?.customer_phone ?? '-'}`).catch(() => {})
  }

  return NextResponse.json({ data: order ?? { id, status: 'approved' }, error: null })
}
