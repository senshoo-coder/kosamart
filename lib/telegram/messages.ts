import type { Order, Delivery } from '@/lib/types'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!

// =============================================
// 텔레그램 메시지 발송
// =============================================
export async function sendTelegramMessage(chatId: string | number, text: string): Promise<boolean> {
  if (!BOT_TOKEN || !chatId) return false
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
    return res.ok
  } catch {
    return false
  }
}

// 관리방 (관리자+관리팀)
export async function notifyAdmin(text: string) {
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID
  if (chatId) await sendTelegramMessage(chatId, text)
}

// 배달방 (관리자+관리팀+배달기사)
export async function notifyDriver(text: string, driverChatId?: number) {
  const chatId = driverChatId ?? process.env.TELEGRAM_DRIVER_CHAT_ID
  if (chatId) await sendTelegramMessage(chatId, text)
}

// 가게방 (사장+멤버+관리자+관리팀) — chat_id는 stores-config에서 가져옴
export async function notifyStore(storeChatId: string | number | null | undefined, text: string) {
  if (storeChatId) await sendTelegramMessage(storeChatId, text)
}

// =============================================
// 메시지 템플릿
// =============================================
export const TelegramMessages = {
  // 신규 주문 접수
  newOrder: (order: Order) => `
📢 <b>[신규 주문 접수]</b>

주문번호: <code>${order.order_number}</code>
주문자: <b>${order.kakao_nickname}</b>
금액: <b>₩${order.total_amount.toLocaleString()}</b>
주소: ${order.delivery_address}
${order.delivery_memo ? `메모: ${order.delivery_memo}` : ''}

→ 관리자 페이지에서 입금 확인 후 승인해주세요`,

  // 주문 승인 (배달)
  orderApproved: (order: Order) => `
✅ <b>[주문 승인 완료 · 배달 준비]</b>

<b>${order.kakao_nickname}</b>님의 주문이 승인되었습니다.

주문번호: <code>${order.order_number}</code>
금액: ₩${order.total_amount.toLocaleString()}
${order.owner_memo ? `안내사항: ${order.owner_memo}` : ''}

배달이 시작되면 다시 안내드립니다 🚚`,

  // 고객 픽업 승인
  pickupApproved: (order: Order) => `
✅ <b>[고객 픽업 승인 · 준비완료]</b>

<b>${order.kakao_nickname}</b>님의 픽업 주문이 승인되었습니다.

주문번호: <code>${order.order_number}</code>
매장: ${(order as any).store_name ?? '-'}
금액: ₩${order.total_amount.toLocaleString()}
${order.delivery_memo ? `메모: ${order.delivery_memo}` : ''}

매장에서 준비가 완료되었습니다. 방문하여 픽업해 주세요 🏪`,

  // 고객 픽업 완료
  pickupCompleted: (order: Order) => `
🏪 <b>[고객 픽업 완료]</b>

<b>${order.kakao_nickname}</b>님이 직접 픽업을 완료했습니다.

주문번호: <code>${order.order_number}</code>
매장: ${(order as any).store_name ?? '-'}
금액: ₩${order.total_amount.toLocaleString()}

이용해주셔서 감사합니다 💚`,

  // 주문 거절 (고객에게)
  orderRejected: (order: Order) => `
❌ <b>[주문 거절]</b>

주문번호: <code>${order.order_number}</code>
사유: ${order.rejected_reason ?? '미기재'}

불편을 드려 죄송합니다.`,

  // 배달 출발 (관리자 + 고객)
  deliveryStarted: (order: Order) => `
🚚 <b>[배달 출발]</b>

<b>${order.kakao_nickname}</b>님 주문 배달이 시작되었습니다.
주문번호: <code>${order.order_number}</code>
배달지: ${order.delivery_address}

곧 도착합니다! 📦`,

  // 배달 완료
  deliveryCompleted: (order: Order, memo?: string) => `
🎉 <b>[배달 완료]</b>

<b>${order.kakao_nickname}</b>님 배달이 완료되었습니다.
주문번호: <code>${order.order_number}</code>
${memo ? `기사 메모: ${memo}` : ''}

이용해주셔서 감사합니다 💚`,

  // 배달 실패 (관리자에게)
  deliveryFailed: (order: Order, reason: string) => `
⚠️ <b>[배달 실패 보고]</b>

주문번호: <code>${order.order_number}</code>
주문자: ${order.kakao_nickname}
주소: ${order.delivery_address}
사유: <b>${reason}</b>

즉시 고객에게 연락이 필요합니다.`,

  // 상점가 신규 주문
  newMarketOrder: (order: {
    order_number: string
    kakao_nickname: string
    store_name: string
    pickup_type: string
    delivery_address?: string
    total_amount: number
    items: { product_name: string; quantity: number; subtotal: number }[]
  }) => `
📢 <b>[상점가 신규 주문]</b>

매장: <b>${order.store_name}</b>
주문번호: <code>${order.order_number}</code>
주문자: <b>${order.kakao_nickname}</b>
유형: ${order.pickup_type === 'bopis' ? '🏪 매장 픽업' : '🚚 문앞 배송 O2O'}
${order.delivery_address ? `주소: ${order.delivery_address}` : ''}
금액: <b>₩${order.total_amount.toLocaleString()}</b>

상품:
${order.items.map(i => `• ${i.product_name} x${i.quantity} (₩${i.subtotal.toLocaleString()})`).join('\n')}`,

  // 픽업/배달 시간 알림 (T-60, T-30)
  scheduleAlert: (order: {
    order_number: string
    kakao_nickname: string
    customer_phone?: string
    store_name: string
    delivery_address: string
    total_amount: number
    scheduled_at: string
  }, minutesBefore: number) => {
    const isPickup = order.delivery_address === '매장 픽업'
    const timeLabel = isPickup ? '픽업' : '배달'
    const scheduledTime = new Date(order.scheduled_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
    return [
      `⏰ <b>[${timeLabel} ${minutesBefore}분 전 알림]</b>`,
      ``,
      `주문번호: <code>${order.order_number}</code>`,
      `주문자: <b>${order.kakao_nickname}</b>`,
      `전화번호: ${order.customer_phone ?? '-'}`,
      `매장: ${order.store_name}`,
      isPickup ? `유형: 🏪 매장 픽업` : `유형: 🚚 배달\n주소: ${order.delivery_address}`,
      `예정시간: <b>${scheduledTime}</b>`,
      `금액: ₩${order.total_amount?.toLocaleString() ?? ''}`,
    ].join('\n')
  },

  // 일일 정산 리포트
  dailyReport: (data: {
    date: string
    totalOrders: number
    totalAmount: number
    pendingCount: number
    deliveredCount: number
    cancelledCount: number
  }) => `
📊 <b>[일일 정산 리포트]</b>
${data.date}

━━━━━━━━━━━━━━
총 주문: ${data.totalOrders}건
총 매출: ₩${data.totalAmount.toLocaleString()}

✅ 배달완료: ${data.deliveredCount}건
⏳ 처리중: ${data.pendingCount}건
❌ 취소: ${data.cancelledCount}건
━━━━━━━━━━━━━━

내일도 파이팅! 🛒`,
}
