import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import { DEMO_DELIVERIES } from '@/lib/demo-data'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https')

// GET /api/deliveries
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const driverUuidParam = searchParams.get('driver_uuid')
  const statusParam = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '50')

  if (isDemoMode) {
    let deliveries = [...DEMO_DELIVERIES]
    if (statusParam) {
      const statuses = statusParam.split(',').map(s => s.trim())
      deliveries = deliveries.filter(d => statuses.includes(d.status))
    }
    return NextResponse.json({ data: deliveries.slice(0, limit), error: null })
  }

  const supabase = await createAdminClient()

  let query = supabase
    .from('deliveries')
    .select(`
      *,
      order:orders(
        *,
        items:order_items(*),
        customer:users!orders_customer_id_fkey(id, nickname, phone)
      ),
      driver:users!deliveries_driver_id_fkey(id, nickname, device_uuid)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  // 배달맨 필터: driver_uuid 파라미터가 명시된 경우에만 필터 적용
  // (available/pending 목록은 driver_uuid 없이 호출되므로 필터 안 함)
  if (driverUuidParam) {
    const cookieStore = await cookies()
    const cookieUserId = cookieStore.get('cosmart_user_id')?.value
    let driverId: string | null = null

    if (cookieUserId) {
      const { data: driver } = await supabase
        .from('users')
        .select('id')
        .eq('id', cookieUserId)
        .eq('role', 'driver')
        .single()
      if (driver) driverId = driver.id
    }

    if (!driverId && driverUuidParam) {
      const { data: driver } = await supabase
        .from('users')
        .select('id')
        .eq('device_uuid', driverUuidParam)
        .single()
      if (driver) driverId = driver.id
    }

    if (driverId) {
      query = query.eq('driver_id', driverId)
    }
  }

  // 상태 필터
  if (statusParam) {
    const statuses = statusParam.split(',').map(s => s.trim()).filter(Boolean)
    if (statuses.length === 1) {
      query = query.eq('status', statuses[0])
    } else if (statuses.length > 1) {
      query = query.in('status', statuses)
    }
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

  // pending 배달은 승인된 주문(order.status = 'approved')만 노출
  // 취소/거절 주문의 delivery는 제외
  // 매장 픽업 주문은 배달맨 목록에 노출 안 함
  const filtered = data?.filter(d => {
    if (d.order?.delivery_address === '매장 픽업') return false
    if (d.status === 'pending') {
      return d.order?.status === 'approved'
    }
    return true
  }) ?? []

  return NextResponse.json({ data: filtered, error: null })
}
