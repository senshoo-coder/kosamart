import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyAdmin, TelegramMessages } from '@/lib/telegram/messages'

// POST /api/webhooks/cron/[event] — pg_cron 예약 작업 핸들러
export async function POST(req: NextRequest, { params }: { params: Promise<{ event: string }> }) {
  const { event } = await params
  const supabase = await createAdminClient()

  switch (event) {
    // 매일 오전 8시 — 당일 공구 오픈 알림
    case 'daily-open': {
      const today = new Date().toISOString().split('T')[0]
      const { data: buys } = await supabase
        .from('group_buys')
        .select('*')
        .eq('status', 'active')
        .gte('open_at', `${today}T00:00:00`)
        .lte('open_at', `${today}T23:59:59`)

      if (buys?.length) {
        await notifyAdmin(`🛒 오늘의 공동구매가 오픈되었습니다!\n${buys.map(b => `• ${b.title}`).join('\n')}`)
      }
      break
    }

    // 매일 오후 2시 — 마감 1시간 전 알림
    case 'closing-notice': {
      const now = new Date()
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000).toISOString()
      const { data: buys } = await supabase
        .from('group_buys')
        .select('*')
        .eq('status', 'active')
        .lte('close_at', oneHourLater)
        .gte('close_at', now.toISOString())

      if (buys?.length) {
        await notifyAdmin(`⏰ 마감 1시간 전!\n${buys.map(b => `• ${b.title}`).join('\n')}`)
      }
      break
    }

    // 매일 오후 11시 — 일일 리포트
    case 'daily-report': {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { data: orders } = await supabase
        .from('orders')
        .select('status, total_amount')
        .gte('created_at', today.toISOString())

      if (orders) {
        const msg = TelegramMessages.dailyReport({
          date: today.toLocaleDateString('ko-KR'),
          totalOrders: orders.length,
          pendingCount: orders.filter(o => o.status === 'pending').length,
          deliveredCount: orders.filter(o => o.status === 'delivered').length,
          cancelledCount: orders.filter(o => ['cancelled', 'rejected'].includes(o.status)).length,
          totalAmount: orders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total_amount ?? 0), 0),
        })
        await notifyAdmin(msg)
      }
      break
    }

    // 미결제 주문 5분마다 체크 — 30분 경과 시 취소
    case 'pending-timeout': {
      const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      const { data: expired } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('status', 'pending')
        .lte('created_at', cutoff)
        .select('kakao_nickname, order_number')

      if (expired?.length) {
        await notifyAdmin(`🚫 미결제 주문 자동 취소 ${expired.length}건\n${expired.map(o => `• ${o.kakao_nickname} (${o.order_number})`).join('\n')}`)
      }
      break
    }

    default:
      return NextResponse.json({ ok: false, error: `Unknown event: ${event}` }, { status: 400 })
  }

  return NextResponse.json({ ok: true, event })
}
