import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getOwnerStoreId } from '@/lib/auth/owner-store'
import { notifyAdmin, notifyStore, getStoreChatId } from '@/lib/telegram/messages'
import { enrichLatestStatusLog } from '@/lib/audit/order-status-log'

// POST /api/orders/[id]/close-failed
// 배달 실패 → 종료 (취소). 더 이상 재시도하지 않음.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const role = cookieStore.get('cosmart_role')?.value
  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ data: null, error: '권한이 없습니다' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const closeReason = (body.close_reason || '').trim()

  if (!closeReason) {
    return NextResponse.json({ data: null, error: '종료 사유를 입력해주세요' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  const { data: order } = await supabase
    .from('orders')
    .select('id, store_id, status, order_number, kakao_nickname, customer_phone, delivery_address, total_amount, store_name')
    .eq('id', id)
    .single()

  if (!order) return NextResponse.json({ data: null, error: '주문을 찾을 수 없습니다' }, { status: 404 })
  if (order.status !== 'delivery_failed') {
    return NextResponse.json({ data: null, error: '배달실패 상태의 주문만 종료 가능합니다' }, { status: 400 })
  }

  if (role === 'owner') {
    const ownerStoreId = await getOwnerStoreId()
    if (!ownerStoreId || ownerStoreId !== order.store_id) {
      return NextResponse.json({ data: null, error: '본인 가게 주문만 처리 가능' }, { status: 403 })
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from('orders')
    .update({ status: 'cancelled', rejected_reason: `[배달실패 종료] ${closeReason}` })
    .eq('id', id)
    .eq('status', 'delivery_failed')
    .select('id')
  if (updateError) return NextResponse.json({ data: null, error: updateError.message }, { status: 500 })
  if (!updated || updated.length === 0) {
    return NextResponse.json({ data: null, error: '이미 처리되었거나 상태가 변경되었습니다' }, { status: 409 })
  }
  await enrichLatestStatusLog(id, 'cancelled', { note: `[배달실패 종료] ${closeReason}` })

  // 배달 레코드는 failed 유지 (이력 보존)

  const msg = [
    `🛑 <b>[배달 실패 — 종료]</b>`,
    ``,
    `주문번호: <code>${order.order_number}</code>`,
    `주문자: <b>${order.kakao_nickname}</b>`,
    `전화: ${order.customer_phone ?? '-'}`,
    `매장: ${order.store_name ?? '-'}`,
    `주소: ${order.delivery_address}`,
    `금액: ₩${order.total_amount?.toLocaleString() ?? ''}`,
    `종료 사유: <b>${closeReason}</b>`,
  ].join('\n')
  const storeChatId = order.store_id ? await getStoreChatId(order.store_id) : null
  await Promise.all([
    notifyAdmin(msg).catch(() => {}),
    notifyStore(storeChatId, msg).catch(() => {}),
  ])

  return NextResponse.json({ data: { id, status: 'cancelled' }, error: null })
}
