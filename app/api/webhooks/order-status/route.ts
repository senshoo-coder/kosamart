import { NextRequest, NextResponse } from 'next/server'
import { notifyAdmin, notifyDriver, TelegramMessages } from '@/lib/telegram/messages'

// POST /api/webhooks/order-status — pg_net DB 트리거에서 호출
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ ok: false }, { status: 400 })

  const { order, new_status, old_status } = body

  try {
    switch (new_status) {
      case 'approved':
        await notifyAdmin(TelegramMessages.orderApproved(order))
        await notifyDriver(`🚚 새 배달 준비 요청: ${order.kakao_nickname}\n📍 ${order.delivery_address}`)
        break
      case 'rejected':
        await notifyAdmin(TelegramMessages.orderRejected(order))
        break
      case 'delivering':
        await notifyAdmin(TelegramMessages.deliveryStarted(order))
        break
      case 'delivered':
        await notifyAdmin(TelegramMessages.deliveryCompleted(order))
        break
      case 'delivery_failed':
        await notifyAdmin(TelegramMessages.deliveryFailed(order, order.failed_reason ?? ''))
        break
      default:
        break
    }
  } catch (e) {
    console.error('[webhook/order-status] telegram error:', e)
  }

  return NextResponse.json({ ok: true })
}
