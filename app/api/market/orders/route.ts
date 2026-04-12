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

// POST /api/market/orders — 상점가 주문 생성
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { store_id, store_name, device_uuid, nickname, pickup_type, delivery_address, delivery_memo, scheduled_at, items, total_amount, customer_phone } = body

  if (!store_id || !delivery_address || !items?.length) {
    return NextResponse.json({ data: null, error: '필수 항목 누락' }, { status: 400 })
  }

  // 서버사이드 최소 주문금액 검증
  const { getStore } = await import('@/lib/market-data')
  const storeData = getStore(store_id)
  const minOrder = storeData?.minOrder ?? 0
  if (minOrder > 0 && total_amount < minOrder) {
    return NextResponse.json(
      { data: null, error: `최소 주문금액은 ${minOrder.toLocaleString()}원입니다 (현재 ${total_amount?.toLocaleString()}원)` },
      { status: 400 }
    )
  }

  const orderNumber = generateOrderNumber()

  // 데모 모드 — Supabase 없이 주문 처리
  if (isDemoMode) {
    const order = {
      id: `market-${Date.now()}`,
      order_number: orderNumber,
      store_id,
      store_name,
      kakao_nickname: nickname,
      delivery_address,
      delivery_memo,
      pickup_type,
      total_amount,
      status: 'pending',
      is_market_order: true,
      created_at: new Date().toISOString(),
      items,
    }
    return NextResponse.json({ data: order, error: null }, { status: 201 })
  }

  try {
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
    // 게스트/신규 기기 자동 생성 (병렬 요청 race 대비 upsert)
    if (!user && device_uuid) {
      const { error: upsertErr } = await supabase
        .from('users')
        .upsert(
          { device_uuid, nickname: nickname || `게스트-${device_uuid.slice(0, 8)}`, role: 'customer', password_hash: 'guest', status: 'active' },
          { onConflict: 'device_uuid', ignoreDuplicates: true }
        )
      if (upsertErr) {
        console.error('[market/orders] user upsert error:', upsertErr)
        return NextResponse.json({ data: null, error: 'user_create: ' + upsertErr.message }, { status: 500 })
      }
      const { data: reFetched } = await supabase.from('users').select('id').eq('device_uuid', device_uuid).single()
      user = reFetched
    }
    if (!user) {
      return NextResponse.json({ data: null, error: '인증 필요 (device_uuid 없음)' }, { status: 401 })
    }

    // 주문 생성 (group_buy_id 없는 상점가 주문)
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        customer_id: user.id,
        kakao_nickname: nickname,
        customer_phone: customer_phone || null,
        delivery_address,
        delivery_memo: delivery_memo || null,
        scheduled_at: scheduled_at || null,
        total_amount,
        order_number: orderNumber,
        store_id,
        store_name,
        owner_memo: `[상점가] ${store_name}`,
      })
      .select()
      .single()

    if (error) {
      console.error('[market/orders] order insert error:', error)
      return NextResponse.json({ data: null, error: 'order_insert: ' + error.message }, { status: 500 })
    }

    // 주문 상품 저장 (market 상품은 products 테이블에 없으므로 product_id는 null)
    const orderItems = items.map((i: any) => ({
      order_id: order.id,
      product_id: null,
      product_name: i.product_name,
      unit_price: i.unit_price,
      quantity: i.quantity,
      subtotal: i.subtotal ?? i.unit_price * i.quantity,
    }))
    const { error: itemsErr } = await supabase.from('order_items').insert(orderItems)
    if (itemsErr) {
      console.error('[market/orders] order_items insert error:', itemsErr)
      return NextResponse.json({ data: null, error: 'items_insert: ' + itemsErr.message }, { status: 500 })
    }

    // 배달 레코드 — 픽업 주문은 배달 레코드 생성하지 않음
    const isPickup = delivery_address === '매장 픽업'
    if (!isPickup) {
      await supabase.from('deliveries').insert({ order_id: order.id }).then(({ error: e }) => {
        if (e) console.error('[market/orders] deliveries insert error:', e)
      })
    }

    // 텔레그램 알림 (실패해도 주문은 성공)
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
      notifyAdmin(msg).catch(e => console.error('[market/orders] telegram admin error:', e)),
      notifyStore(storeChatId, msg).catch(e => console.error('[market/orders] telegram store error:', e)),
    ])

    return NextResponse.json({ data: order, error: null }, { status: 201 })
  } catch (e: any) {
    console.error('[market/orders] unexpected error:', e)
    return NextResponse.json({ data: null, error: 'unexpected: ' + (e?.message || String(e)) }, { status: 500 })
  }
}
