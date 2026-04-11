import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendTelegramMessage, notifyAdmin, notifyDriver, TelegramMessages } from '@/lib/telegram/messages'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const supabase = await createAdminClient()

  const { data: order, error } = await supabase
    .from('orders')
    .update({ status: 'approved', owner_memo: body.owner_memo, approved_at: new Date().toISOString() })
    .eq('id', id)
    .select(`*, items:order_items(*), customer:users!orders_customer_id_fkey(telegram_chat_id)`)
    .single()

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

  // 고객 개인 텔레그램 알림
  const customerMsg = TelegramMessages.orderApproved(order)
  if (order.customer?.telegram_chat_id) {
    await sendTelegramMessage(order.customer.telegram_chat_id, customerMsg)
  }

  // 관리자 알림
  await notifyAdmin(`✅ [주문 승인] ${order.kakao_nickname} | ₩${order.total_amount.toLocaleString()}`)

  // 배달팀 알림
  await notifyDriver(`🚚 배달 준비 요청: ${order.kakao_nickname}\n주소: ${order.delivery_address}`)

  return NextResponse.json({ data: order, error: null })
}
