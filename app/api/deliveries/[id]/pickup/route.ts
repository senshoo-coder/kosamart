import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyAdmin, notifyStore, getStoreChatId } from '@/lib/telegram/messages'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  }

  const msg = `🚚 <b>[배달 출발]</b>\n주문자: ${data.order?.kakao_nickname}\n주소: ${data.order?.delivery_address}`
  const storeChatId = data.order?.store_id ? await getStoreChatId(data.order.store_id) : null
  await Promise.all([notifyAdmin(msg), notifyStore(storeChatId, msg)])

  return NextResponse.json({ data, error: null })
}
