import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { generateOrderNumber } from '@/lib/utils'
import { notifyAdmin, notifyStore, TelegramMessages } from '@/lib/telegram/messages'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

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

const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https')

function generateBundleId() {
  const now = new Date()
  const ymd = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
  return `BN${ymd}-${rand}`
}

// POST /api/market/orders/bundle — 묶음 주문 생성
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { device_uuid, nickname, pickup_type, delivery_address, delivery_memo, stores } = body

  if (!delivery_address || !stores?.length) {
    return NextResponse.json({ data: null, error: '필수 항목 누락' }, { status: 400 })
  }

  const bundleId = generateBundleId()

  // 데모 모드
  if (isDemoMode) {
    const orders = stores.map((s: any) => ({
      id: `market-${Date.now()}-${s.store_id}`,
      order_number: generateOrderNumber(),
      bundle_id: bundleId,
      store_id: s.store_id,
      store_name: s.store_name,
      kakao_nickname: nickname,
      delivery_address,
      delivery_memo,
      pickup_type,
      total_amount: s.total_amount,
      status: 'pending',
      is_market_order: true,
      created_at: new Date().toISOString(),
      items: s.items,
    }))
    return NextResponse.json({ data: { bundle_id: bundleId, orders }, error: null }, { status: 201 })
  }

  // Supabase 모드
  const { createAdminClient } = await import('@/lib/supabase/server')
  const supabase = await createAdminClient()

  // 고객 조회
  const cookieStore = await cookies()
  const cookieUserId = cookieStore.get('cosmart_user_id')?.value

  let user: { id: string } | null = null
  if (cookieUserId) {
    const { data } = await supabase.from('users').select('id').eq('id', cookieUserId).single()
    user = data
  }
  if (!user && device_uuid) {
    const { data } = await supabase.from('users').select('id').eq('device_uuid', device_uuid).single()
    user = data
  }
  if (!user) {
    return NextResponse.json({ data: null, error: '인증 필요' }, { status: 401 })
  }

  const createdOrders: any[] = []

  for (const storeOrder of stores) {
    const { store_id, store_name, items, total_amount } = storeOrder
    const orderNumber = generateOrderNumber()

    // 주문 생성
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        customer_id: user.id,
        kakao_nickname: nickname,
        delivery_address,
        customer_memo: delivery_memo,
        total_amount,
        order_number: orderNumber,
        store_id,
        bundle_id: bundleId,
        owner_memo: stores.length > 1 ? `[묶음배송 ${bundleId}] ${store_name}` : `[상점가] ${store_name}`,
      })
      .select()
      .single()

    if (error) {
      console.error('bundle order insert error:', error.message)
      continue
    }

    // 주문 상품
    const orderItems = items.map((i: any) => ({ ...i, order_id: order.id }))
    await supabase.from('order_items').insert(orderItems)

    // 배달 레코드
    await supabase.from('deliveries').insert({ order_id: order.id })

    createdOrders.push({ ...order, items: orderItems })

    // 텔레그램 알림 — 관리방 + 가게방
    const msg = TelegramMessages.newMarketOrder({
      order_number: order.order_number,
      kakao_nickname: order.kakao_nickname,
      store_name,
      pickup_type,
      delivery_address: order.delivery_address,
      total_amount: order.total_amount,
      items: orderItems,
    })
    const storeChatId = await getStoreChatId(store_id).catch(() => null)
    await Promise.all([
      notifyAdmin(msg).catch(() => {}),
      notifyStore(storeChatId, msg).catch(() => {}),
    ])
  }

  if (createdOrders.length === 0) {
    return NextResponse.json({ data: null, error: '주문 생성 실패' }, { status: 500 })
  }

  return NextResponse.json({
    data: { bundle_id: bundleId, orders: createdOrders },
    error: null,
  }, { status: 201 })
}
