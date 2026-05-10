import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyAdmin, notifyStore, getStoreChatId, TelegramMessages } from '@/lib/telegram/messages'
import { cookies } from 'next/headers'
import { enrichLatestStatusLog } from '@/lib/audit/order-status-log'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const role = cookieStore.get('cosmart_role')?.value
  if (role !== 'driver' && role !== 'admin') {
    return NextResponse.json({ data: null, error: '권한이 없습니다' }, { status: 403 })
  }

  const { id } = await params
  const { failed_reason } = await req.json()

  const reasonTrimmed = (failed_reason ?? '').trim()
  if (!reasonTrimmed) {
    return NextResponse.json({ data: null, error: '실패 사유를 입력해주세요' }, { status: 400 })
  }
  // "기타"는 반드시 콜론 뒤 세부 내용이 있어야 함 ("기타", "기타:", "기타: " 모두 차단)
  if (/^기타\s*:?\s*$/.test(reasonTrimmed)) {
    return NextResponse.json({ data: null, error: '기타 사유의 세부 내용을 입력해주세요' }, { status: 400 })
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
    await enrichLatestStatusLog(data.order_id, 'delivery_failed', { note: reasonTrimmed })
  }

  const msg = data.order ? TelegramMessages.deliveryFailed(data.order, failed_reason) : ''
  if (msg) {
    const storeChatId = data.order?.store_id ? await getStoreChatId(data.order.store_id) : null
    await Promise.all([notifyAdmin(msg), notifyStore(storeChatId, msg)])
  }

  return NextResponse.json({ data, error: null })
}
