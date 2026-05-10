import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyAdmin, notifyStore, getStoreChatId } from '@/lib/telegram/messages'
import { cookies } from 'next/headers'
import { enrichLatestStatusLog } from '@/lib/audit/order-status-log'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const role = cookieStore.get('cosmart_role')?.value
  if (role !== 'driver' && role !== 'admin') {
    return NextResponse.json({ data: null, error: '권한이 없습니다' }, { status: 403 })
  }

  const { id } = await params
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('deliveries')
    .update({ status: 'picked_up', picked_up_at: new Date().toISOString() })
    .eq('id', id)
    .select(`*, order:orders(store_id, order_number, kakao_nickname, delivery_address)`)
    .single()

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

  // 주문 상태도 delivering으로 업데이트
  if (data.order_id) {
    await supabase.from('orders').update({ status: 'delivering' }).eq('id', data.order_id)
    await enrichLatestStatusLog(data.order_id, 'delivering', { note: '배달맨 픽업 완료' })
  }

  const msg = `🚚 <b>[배달 출발]</b>\n주문자: ${data.order?.kakao_nickname}\n주소: ${data.order?.delivery_address}`
  const storeChatId = data.order?.store_id ? await getStoreChatId(data.order.store_id) : null
  await Promise.all([notifyAdmin(msg), notifyStore(storeChatId, msg)])

  return NextResponse.json({ data, error: null })
}
