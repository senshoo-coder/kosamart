import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyAdmin, TelegramMessages } from '@/lib/telegram/messages'

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
      driver_photo_url: body.driver_photo_url ?? null,
    })
    .eq('id', id)
    .select(`*, order:orders(id, kakao_nickname, delivery_address, total_amount)`)
    .single()

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

  // 주문 상태도 delivered로 업데이트
  if (data.order_id) {
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', data.order_id)
  }

  const msg = data.order ? TelegramMessages.deliveryCompleted(data.order) : ''
  if (msg) await notifyAdmin(msg)

  return NextResponse.json({ data, error: null })
}
