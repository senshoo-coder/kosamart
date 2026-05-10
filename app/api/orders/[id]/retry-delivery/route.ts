import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getOwnerStoreId } from '@/lib/auth/owner-store'
import { notifyAdmin, notifyDriver } from '@/lib/telegram/messages'

// POST /api/orders/[id]/retry-delivery
// 배달 실패 → 재배달 시도. 주문을 approved로 되돌리고 배달 레코드를 pending으로 리셋.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const role = cookieStore.get('cosmart_role')?.value
  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ data: null, error: '권한이 없습니다' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const ownerNote = (body.owner_note || '').trim()

  const supabase = await createAdminClient()

  const { data: order } = await supabase
    .from('orders')
    .select('id, store_id, status, order_number, kakao_nickname, customer_phone, delivery_address, owner_memo, store_name')
    .eq('id', id)
    .single()

  if (!order) return NextResponse.json({ data: null, error: '주문을 찾을 수 없습니다' }, { status: 404 })
  if (order.status !== 'delivery_failed') {
    return NextResponse.json({ data: null, error: '배달실패 상태의 주문만 재시도 가능합니다' }, { status: 400 })
  }

  if (role === 'owner') {
    const ownerStoreId = await getOwnerStoreId()
    if (!ownerStoreId || ownerStoreId !== order.store_id) {
      return NextResponse.json({ data: null, error: '본인 가게 주문만 처리 가능' }, { status: 403 })
    }
  }

  // 주문 → approved 복귀
  // 메모가 비어있어도 [재배달] 마커는 항상 남겨서 새 배달맨이 재배달건임을 알 수 있게
  const ts = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
  const retryLine = ownerNote ? `[재배달 ${ts}] ${ownerNote}` : `[재배달 ${ts}]`
  const newOwnerMemo = order.owner_memo ? `${order.owner_memo}\n${retryLine}` : retryLine
  const { error: updateOrderError } = await supabase
    .from('orders')
    .update({ status: 'approved', owner_memo: newOwnerMemo })
    .eq('id', id)
  if (updateOrderError) return NextResponse.json({ data: null, error: updateOrderError.message }, { status: 500 })

  // 배달 레코드 리셋: 기존 failed 레코드를 pending으로 되돌리되 failed_reason은 보존
  // (새 배달맨이 이전 실패 맥락을 알 수 있도록)
  const { error: updateDeliveryError } = await supabase
    .from('deliveries')
    .update({
      status: 'pending',
      driver_id: null,
      assigned_at: null,
      picked_up_at: null,
      delivered_at: null,
    })
    .eq('order_id', id)
  if (updateDeliveryError) {
    // 레코드가 없을 수도 있어서 새로 생성 시도
    await supabase.from('deliveries').insert({ order_id: id })
  }

  const msg = [
    `🔄 <b>[재배달 요청]</b>`,
    ``,
    `주문번호: <code>${order.order_number}</code>`,
    `주문자: <b>${order.kakao_nickname}</b>`,
    `전화: ${order.customer_phone ?? '-'}`,
    `매장: ${order.store_name ?? '-'}`,
    `주소: ${order.delivery_address}`,
    ownerNote ? `사장님 메모: ${ownerNote}` : null,
    ``,
    `→ 배달팀 다시 배정 가능 상태입니다 🚚`,
  ].filter(Boolean).join('\n')

  await Promise.all([
    notifyAdmin(msg).catch(() => {}),
    notifyDriver(`🔄 재배달 요청: ${order.kakao_nickname}\n📍 ${order.delivery_address}\n📞 ${order.customer_phone ?? '-'}`).catch(() => {}),
  ])

  return NextResponse.json({ data: { id, status: 'approved' }, error: null })
}
