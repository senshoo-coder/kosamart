import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyAdmin, notifyStore, getStoreChatId, TelegramMessages } from '@/lib/telegram/messages'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('deliveries')
    .update({
      status: 'delivered',
      delivered_at: new Date().toISOString(),
      driver_memo: body.driver_memo,
      delivery_photo_url: body.driver_photo_url ?? null,
    })
    .eq('id', id)
    .select(`*, order:orders(id, store_id, order_number, kakao_nickname, delivery_address, total_amount)`)
    .single()

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

  // 주문 상태도 delivered로 업데이트
  if (data.order_id) {
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', data.order_id)
  }

  const msg = data.order ? TelegramMessages.deliveryCompleted(data.order, body.driver_memo) : ''
  if (msg) {
    const storeChatId = data.order?.store_id ? await getStoreChatId(data.order.store_id) : null
    await Promise.all([notifyAdmin(msg), notifyStore(storeChatId, msg)])
  }

  return NextResponse.json({ data, error: null })
}
