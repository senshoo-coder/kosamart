import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyAdmin } from '@/lib/telegram/messages'
import { cookies } from 'next/headers'
import { getOwnerStoreId } from '@/lib/auth/owner-store'
import { enrichLatestStatusLog } from '@/lib/audit/order-status-log'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const role = cookieStore.get('cosmart_role')?.value
  if (role !== 'admin' && role !== 'owner') {
    return NextResponse.json({ data: null, error: '권한이 없습니다' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const rejected_reason = body.rejected_reason || ''

  if (!rejected_reason.trim()) {
    return NextResponse.json({ data: null, error: '취소 사유를 입력해주세요' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  if (role === 'owner') {
    const ownerStoreId = await getOwnerStoreId()
    const { data: orderOwner } = await supabase.from('orders').select('store_id').eq('id', id).single()
    if (!ownerStoreId || !orderOwner || orderOwner.store_id !== ownerStoreId) {
      return NextResponse.json({ data: null, error: '본인 가게 주문만 처리 가능' }, { status: 403 })
    }
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'rejected', rejected_reason })
    .eq('id', id)
    .in('status', ['pending', 'paid'])

  if (updateError) {
    return NextResponse.json({ data: null, error: updateError.message }, { status: 500 })
  }
  await enrichLatestStatusLog(id, 'rejected', { note: rejected_reason })

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  // 배달 레코드 취소 (실패해도 무시)
  try { await supabase.from('deliveries').update({ status: 'cancelled' }).eq('order_id', id) } catch {}

  // 관리자 알림 (실패해도 무시)
  const cancelMsg = [
    `❌ <b>[주문 취소]</b>`,
    ``,
    `주문번호: <code>${order?.order_number ?? id}</code>`,
    `주문자: <b>${order?.kakao_nickname ?? '-'}</b>`,
    `전화번호: ${order?.customer_phone ?? '-'}`,
    `매장: ${order?.store_name ?? '-'}`,
    `금액: ₩${order?.total_amount?.toLocaleString() ?? ''}`,
    `사유: <b>${rejected_reason}</b>`,
  ].join('\n')
  await notifyAdmin(cancelMsg).catch(() => {})

  return NextResponse.json({ data: order ?? { id, status: 'rejected' }, error: null })
}
