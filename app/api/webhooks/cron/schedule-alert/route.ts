import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyAdmin, notifyStore, notifyDriver } from '@/lib/telegram/messages'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const CRON_SECRET = process.env.CRON_SECRET

async function getStoreChatId(storeId: string): Promise<string | null> {
  try {
    const res = await fetch(`${SUPA_URL}/storage/v1/object/authenticated/config/stores-config.json`, {
      headers: { Authorization: `Bearer ${SUPA_KEY}`, apikey: SUPA_KEY },
    })
    if (!res.ok) return null
    const config = await res.json()
    const override = config?.overrides?.[storeId]
    if (override?.telegram_chat_id) return override.telegram_chat_id
    const custom = config?.custom?.find((s: any) => s.id === storeId)
    return custom?.telegram_chat_id ?? null
  } catch { return null }
}

// POST /api/webhooks/cron/schedule-alert
// Railway cron 또는 pg_cron에서 매 5분마다 호출
// scheduled_at 기준 T-60분(±5분), T-30분(±5분) 알림 발송
export async function POST(req: NextRequest) {
  // 간단한 시크릿 검증
  if (CRON_SECRET) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = await createAdminClient()
  const now = new Date()

  // T-60 윈도우: scheduled_at이 지금부터 55~65분 사이
  const t60lo = new Date(now.getTime() + 55 * 60 * 1000).toISOString()
  const t60hi = new Date(now.getTime() + 65 * 60 * 1000).toISOString()

  // T-30 윈도우: scheduled_at이 지금부터 25~35분 사이
  const t30lo = new Date(now.getTime() + 25 * 60 * 1000).toISOString()
  const t30hi = new Date(now.getTime() + 35 * 60 * 1000).toISOString()

  // 처리 중인 주문만 대상 (approved, paid 등 — 완료/취소 제외)
  const activeStatuses = ['pending', 'paid', 'approved', 'preparing']

  const { data: orders60 } = await supabase
    .from('orders')
    .select('id, order_number, kakao_nickname, customer_phone, delivery_address, store_name, store_id, total_amount, scheduled_at, status')
    .gte('scheduled_at', t60lo)
    .lte('scheduled_at', t60hi)
    .in('status', activeStatuses)

  const { data: orders30 } = await supabase
    .from('orders')
    .select('id, order_number, kakao_nickname, customer_phone, delivery_address, store_name, store_id, total_amount, scheduled_at, status')
    .gte('scheduled_at', t30lo)
    .lte('scheduled_at', t30hi)
    .in('status', activeStatuses)

  let sent60 = 0
  let sent30 = 0

  async function sendAlerts(order: any, minutesBefore: number) {
    const isPickup = order.delivery_address === '매장 픽업'
    const timeLabel = isPickup ? '픽업' : '배달'
    const scheduledTime = new Date(order.scheduled_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })

    const msg = [
      `⏰ <b>[${timeLabel} ${minutesBefore}분 전 알림]</b>`,
      ``,
      `주문번호: <code>${order.order_number}</code>`,
      `주문자: <b>${order.kakao_nickname}</b>`,
      `전화번호: ${order.customer_phone ?? '-'}`,
      `매장: ${order.store_name ?? '-'}`,
      isPickup
        ? `유형: 🏪 매장 픽업`
        : `유형: 🚚 배달\n주소: ${order.delivery_address}`,
      `예정시간: <b>${scheduledTime}</b>`,
      `금액: ₩${order.total_amount?.toLocaleString() ?? ''}`,
    ].join('\n')

    const storeChatId = order.store_id ? await getStoreChatId(order.store_id).catch(() => null) : null

    if (isPickup) {
      // 픽업: 가게방 + 관리방
      await Promise.all([
        notifyAdmin(msg).catch(() => {}),
        notifyStore(storeChatId, msg).catch(() => {}),
      ])
    } else {
      // 배달: 배달방 + 가게방 + 관리방
      await Promise.all([
        notifyAdmin(msg).catch(() => {}),
        notifyStore(storeChatId, msg).catch(() => {}),
        notifyDriver(msg).catch(() => {}),
      ])
    }
  }

  for (const order of orders60 ?? []) {
    await sendAlerts(order, 60)
    sent60++
  }

  for (const order of orders30 ?? []) {
    await sendAlerts(order, 30)
    sent30++
  }

  return NextResponse.json({
    ok: true,
    checked_at: now.toISOString(),
    sent_60min: sent60,
    sent_30min: sent30,
  })
}

// GET 지원 — Railway Health Check용
export async function GET() {
  return NextResponse.json({ ok: true, message: 'schedule-alert cron endpoint' })
}
