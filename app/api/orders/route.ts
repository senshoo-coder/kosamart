import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateOrderNumber } from '@/lib/utils'
import { DEMO_ORDERS } from '@/lib/demo-data'
import { cookies } from 'next/headers'
import { notifyAdmin, TelegramMessages } from '@/lib/telegram/messages'

const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https')

// GET /api/orders — 주문 목록 조회
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const deviceUuid = searchParams.get('device_uuid')
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '50')

  if (isDemoMode) {
    let orders = [...DEMO_ORDERS]
    // 사장님 데모모드: store_id 필터링
    const cookieStore = await cookies()
    const demoRole = cookieStore.get('cosmart_role')?.value
    if (demoRole === 'owner') {
      const demoUserId = cookieStore.get('cosmart_user_id')?.value
      const DEMO_OWNER_STORES: Record<string, string> = {
        'demo-owner-001': 'central-super',
        'demo-owner-002': 'banchan',
        'demo-owner-003': 'butcher',
        'demo-owner-004': 'bonjuk',
        'demo-owner-005': 'chicken',
        'demo-owner-006': 'bakery',
      }
      const demoStoreId = demoUserId ? DEMO_OWNER_STORES[demoUserId] : null
      if (demoStoreId) {
        orders = orders.filter(o => (o as any).store_id === demoStoreId)
      }
    }
    if (deviceUuid) orders = orders.filter(o => o.customer?.device_uuid === deviceUuid)
    if (status && status !== 'all') {
      orders = status === 'cancelled'
        ? orders.filter(o => ['cancelled', 'rejected'].includes(o.status))
        : orders.filter(o => o.status === status)
    }
    return NextResponse.json({ data: orders.slice(0, limit), error: null })
  }

  const supabase = await createAdminClient()

  const cookieStore = await cookies()
  const cookieRole = cookieStore.get('cosmart_role')?.value
  const cookieUserId = cookieStore.get('cosmart_user_id')?.value

  // 인증되지 않은 요청 차단
  const ALLOWED_ROLES = ['admin', 'owner', 'customer']
  if (!cookieRole || !ALLOWED_ROLES.includes(cookieRole)) {
    return NextResponse.json({ data: null, error: '인증이 필요합니다' }, { status: 401 })
  }

  // 관리자가 특정 가게 주문 조회 시 store_id 쿼리 파라미터 지원
  const adminStoreId = cookieRole === 'admin' ? searchParams.get('store_id') : null

  // 사장님: 본인 store_id 확인 — 없으면 빈 배열 반환 (전체 노출 차단)
  let ownerStoreId: string | null = null
  if (cookieRole === 'owner') {
    if (!cookieUserId) return NextResponse.json({ data: [], error: null })
    const { data: ownerUser } = await supabase.from('users').select('store_id').eq('id', cookieUserId).single()
    ownerStoreId = ownerUser?.store_id ?? null
    if (!ownerStoreId) return NextResponse.json({ data: [], error: null })
  }

  // 고객: 본인 ID 확인 — 못 찾으면 빈 배열 반환 (전체 노출 차단)
  let customerId: string | null = null
  if (cookieRole === 'customer') {
    if (cookieUserId) {
      customerId = cookieUserId
    } else if (deviceUuid) {
      const { data: user } = await supabase.from('users').select('id').eq('device_uuid', deviceUuid).single()
      customerId = user?.id ?? null
    }
    if (!customerId) return NextResponse.json({ data: [], error: null })
  }

  let query = supabase
    .from('orders')
    .select(`
      *,
      items:order_items(*),
      customer:users!orders_customer_id_fkey(id, nickname, device_uuid, phone),
      delivery:deliveries(*),
      status_logs:order_status_logs(*, user:users(nickname))
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  // 역할별 필터 적용
  if (cookieRole === 'owner') {
    query = query.eq('store_id', ownerStoreId!)
  } else if (cookieRole === 'customer') {
    query = query.eq('customer_id', customerId!)
  } else if (cookieRole === 'admin' && adminStoreId) {
    query = query.eq('store_id', adminStoreId)
  }

  // 상태 필터
  if (status && status !== 'all') {
    if (status === 'cancelled') {
      query = query.in('status', ['cancelled', 'rejected'])
    } else {
      query = query.eq('status', status)
    }
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

  return NextResponse.json({ data, error: null })
}

// POST /api/orders — 주문 생성
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { group_buy_id, device_uuid, nickname, delivery_address, delivery_memo, items } = body

  if (!group_buy_id || !delivery_address || !items?.length) {
    return NextResponse.json({ data: null, error: '필수 항목 누락' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  // 고객 조회: 쿠키 우선, 없으면 device_uuid로 fallback
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
  if (!user) return NextResponse.json({ data: null, error: '인증 필요' }, { status: 401 })

  // 상품 가격 조회
  const productIds = items.map((i: any) => i.product_id)
  const { data: products } = await supabase.from('products').select('id, name, price').in('id', productIds)
  if (!products) return NextResponse.json({ data: null, error: '상품 조회 실패' }, { status: 400 })

  // 금액 계산
  const orderItems = items.map((item: any) => {
    const product = products.find(p => p.id === item.product_id)
    if (!product) throw new Error(`상품 없음: ${item.product_id}`)
    return {
      product_id: item.product_id,
      product_name: product.name,
      unit_price: product.price,
      quantity: item.quantity,
      subtotal: product.price * item.quantity,
    }
  })
  const totalAmount = orderItems.reduce((sum: number, i: any) => sum + i.subtotal, 0)

  // 주문 생성
  const { data: order, error } = await supabase.from('orders').insert({
    group_buy_id,
    customer_id: user.id,
    kakao_nickname: nickname,
    delivery_address,
    customer_memo: delivery_memo,
    total_amount: totalAmount,
    order_number: generateOrderNumber(),
  }).select().single()

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

  // 주문 상품 저장
  await supabase.from('order_items').insert(orderItems.map((i: any) => ({ ...i, order_id: order.id })))

  // 배달 레코드 생성
  await supabase.from('deliveries').insert({ order_id: order.id })

  // 텔레그램 신규 주문 알림
  await notifyAdmin(TelegramMessages.newOrder({ ...order, items: orderItems }))

  return NextResponse.json({ data: order, error: null }, { status: 201 })
}
