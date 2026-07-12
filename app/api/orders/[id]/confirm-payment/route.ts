import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyAdmin, notifyDriver, escapeHtml as e } from '@/lib/telegram/messages'
import { cookies } from 'next/headers'
import { getOwnerStoreId } from '@/lib/auth/owner-store'
import { enrichLatestStatusLog } from '@/lib/audit/order-status-log'

// POST /api/orders/[id]/confirm-payment
// 입금확인 + 자동 승인 (pending → approved 한 번에)
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const role = cookieStore.get('cosmart_role')?.value
  if (role !== 'admin' && role !== 'owner') {
    return NextResponse.json({ data: null, error: '권한이 없습니다' }, { status: 403 })
  }

  const { id } = await params
  const supabase = await createAdminClient()

  if (role === 'owner') {
    const ownerStoreId = await getOwnerStoreId()
    const { data: orderOwner } = await supabase.from('orders').select('store_id').eq('id', id).single()
    if (!ownerStoreId || !orderOwner || orderOwner.store_id !== ownerStoreId) {
      return NextResponse.json({ data: null, error: '본인 가게 주문만 처리 가능' }, { status: 403 })
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from('orders')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', id)
    .in('status', ['pending', 'paid'])
    .select('id')

  if (updateError) return NextResponse.json({ data: null, error: updateError.message }, { status: 500 })
  if (!updated || updated.length === 0) {
    return NextResponse.json({ data: null, error: '이미 처리되었거나 상태가 변경되었습니다' }, { status: 409 })
  }
  await enrichLatestStatusLog(id, 'approved', { note: '입금확인 자동 승인' })

  const { data: order } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', id)
    .single()

  const items = (order?.order_items ?? [])
    .map((i: { product_name: string; quantity: number; subtotal?: number }) => `• ${e(i.product_name)} x${i.quantity} (₩${i.subtotal?.toLocaleString()})`)
    .join('\n')

  const isPickup = order?.delivery_address === '매장 픽업'

  const msg = [
    isPickup ? `✅ <b>[입금확인 · 고객 픽업 승인]</b>` : `✅ <b>[입금확인 · 배달 준비]</b>`,
    ``,
    `주문번호: <code>${e(order?.order_number ?? id)}</code>`,
    `주문자: <b>${e(order?.kakao_nickname ?? '-')}</b>`,
    `전화번호: ${e(order?.customer_phone ?? '-')}`,
    `매장: ${e(order?.store_name ?? '-')}`,
    `유형: ${isPickup ? '🏪 매장 픽업' : '🚚 배달'}`,
    !isPickup ? `주소: ${e(order?.delivery_address)}` : null,
    order?.delivery_memo ? `메모: ${e(order?.delivery_memo)}` : null,
    `금액: <b>₩${order?.total_amount?.toLocaleString() ?? ''}</b>`,
    ``,
    items ? `상품:\n${items}` : null,
    ``,
    isPickup ? `→ 준비완료 후 고객 픽업을 기다려 주세요 🏪` : `→ 배달팀에 배정 요청이 전달되었습니다 🚚`,
  ].filter(Boolean).join('\n')

  await notifyAdmin(msg).catch(() => {})

  if (!isPickup) {
    await notifyDriver(`🚚 배달 준비 요청: ${e(order?.kakao_nickname)}\n📍 ${e(order?.delivery_address ?? '')}\n📞 ${e(order?.customer_phone ?? '-')}`).catch(() => {})
  }

  return NextResponse.json({ data: order ?? { id, status: 'approved' }, error: null })
}
