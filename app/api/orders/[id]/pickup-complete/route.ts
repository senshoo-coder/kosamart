import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyAdmin, notifyStore } from '@/lib/telegram/messages'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

async function getStoreChatId(storeId: string): Promise<string | null> {
  try {
    const res = await fetch(`${SUPA_URL}/storage/v1/object/authenticated/config/stores-config.json`, {
      headers: { Authorization: `Bearer ${SUPA_KEY}`, apikey: SUPA_KEY },
    })
    if (!res.ok) return null
    const config = await res.json()
    const override = config?.overrides?.[storeId]
    if (override?.telegram_chat_id) return override.telegram_chat_id
    const custom = config?.custom?.find((s: any) => s.id === storeId)
    return custom?.telegram_chat_id ?? null
  } catch { return null }
}

// POST /api/orders/[id]/pickup-complete — 고객 픽업 완료 처리
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createAdminClient()

  // 현재 주문 조회
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', id)
    .single()

  if (fetchError || !order) {
    return NextResponse.json({ data: null, error: '주문을 찾을 수 없습니다' }, { status: 404 })
  }

  if (order.status !== 'approved') {
    return NextResponse.json({ data: null, error: `승인된 주문만 픽업 완료 처리가 가능합니다 (현재: ${order.status})` }, { status: 400 })
  }

  // 상태 업데이트
  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'picked_up_by_customer' })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ data: null, error: updateError.message }, { status: 500 })
  }

  // 상태 이력 기록
  await supabase.from('order_status_logs').insert({
    order_id: id,
    from_status: 'approved',
    to_status: 'picked_up_by_customer',
    note: '매장 픽업 완료',
  }).catch(() => {})

  // 업데이트된 주문 조회
  const { data: updated } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', id)
    .single()

  // 텔레그램 알림 (관리자 + 가게)
  const msg = [
    `🏪 <b>[픽업 완료]</b>`,
    ``,
    `주문번호: <code>${order.order_number}</code>`,
    `주문자: <b>${order.kakao_nickname}</b>`,
    `전화번호: ${order.customer_phone ?? '-'}`,
    `매장: ${order.store_name ?? '-'}`,
    `금액: <b>₩${order.total_amount?.toLocaleString() ?? ''}</b>`,
    ``,
    `고객이 매장에서 상품을 픽업했습니다.`,
  ].join('\n')

  const storeChatId = order.store_id ? await getStoreChatId(order.store_id).catch(() => null) : null
  await Promise.all([
    notifyAdmin(msg).catch(() => {}),
    notifyStore(storeChatId, msg).catch(() => {}),
  ])

  return NextResponse.json({ data: updated ?? { id, status: 'picked_up_by_customer' }, error: null })
}
