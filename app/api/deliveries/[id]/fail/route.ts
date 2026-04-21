import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyAdmin, notifyStore, getStoreChatId, TelegramMessages } from '@/lib/telegram/messages'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { failed_reason } = await req.json()

  if (!failed_reason?.trim()) {
    return NextResponse.json({ data: null, error: '실패 사유를 입력해주세요' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('deliveries')
    .update({ status: 'failed', failed_reason })
    .eq('id', id)
    .select(`*, order:orders(id, store_id, order_number, kakao_nickname, delivery_address)`)
    .single()

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

  if (data.order_id) {
    await supabase.from('orders').update({ status: 'delivery_failed' }).eq('id', data.order_id)
  }

  const msg = data.order ? TelegramMessages.deliveryFailed(data.order, failed_reason) : ''
  if (msg) {
    const storeChatId = data.order?.store_id ? await getStoreChatId(data.order.store_id) : null
    await Promise.all([notifyAdmin(msg), notifyStore(storeChatId, msg)])
  }

  return NextResponse.json({ data, error: null })
}
