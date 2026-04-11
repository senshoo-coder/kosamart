import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyAdmin } from '@/lib/telegram/messages'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createAdminClient()

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'paid' })
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

  const msg = [
    `💰 <b>[입금확인]</b>`,
    ``,
    `주문번호: <code>${order?.order_number ?? id}</code>`,
    `주문자: <b>${order?.kakao_nickname ?? '-'}</b>`,
    `전화번호: ${order?.customer_phone ?? '-'}`,
    `매장: ${order?.store_name ?? '-'}`,
    `유형: ${order?.delivery_address === '매장 픽업' ? '🏪 매장 픽업' : '🚚 배송'}`,
    order?.delivery_address !== '매장 픽업' ? `주소: ${order?.delivery_address}` : null,
    order?.delivery_memo ? `메모: ${order?.delivery_memo}` : null,
    `금액: <b>₩${order?.total_amount?.toLocaleString() ?? ''}</b>`,
    ``,
    items ? `상품:\n${items}` : null,
  ].filter(Boolean).join('\n')

  await notifyAdmin(msg).catch(() => {})

  return NextResponse.json({ data: order ?? { id, status: 'paid' }, error: null })
}
