import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendTelegramMessage, notifyAdmin, TelegramMessages } from '@/lib/telegram/messages'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { rejected_reason } = await req.json()

  if (!rejected_reason?.trim()) {
    return NextResponse.json({ data: null, error: '거절 사유를 입력해주세요' }, { status: 400 })
  }

  const supabase = await createAdminClient()
  const { data: order, error } = await supabase
    .from('orders')
    .update({ status: 'rejected', rejected_reason })
    .eq('id', id)
    .select('*, customer:users!orders_customer_id_fkey(telegram_chat_id)')
    .single()

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

  // 연결된 배달 레코드도 cancelled로 업데이트 (기사 목록에 뜨지 않도록)
  await supabase.from('deliveries').update({ status: 'cancelled' }).eq('order_id', id)

  // 고객 개인 텔레그램 알림
  if (order.customer?.telegram_chat_id) {
    await sendTelegramMessage(order.customer.telegram_chat_id, TelegramMessages.orderRejected(order))
  }

  // 관리자 알림
  await notifyAdmin(`❌ [주문 거절] ${order.kakao_nickname} | 사유: ${rejected_reason}`)

  return NextResponse.json({ data: order, error: null })
}
