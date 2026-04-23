import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { DEMO_STATS } from '@/lib/demo-data'
import { cookies } from 'next/headers'

const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https')

// GET /api/orders/stats — 대시보드 통계
export async function GET(_req: NextRequest) {
  if (isDemoMode) return NextResponse.json({ data: DEMO_STATS, error: null })

  const supabase = await createAdminClient()

  // 사장님이면 본인 store_id로 필터
  const cookieStore = await cookies()
  const cookieRole = cookieStore.get('cosmart_role')?.value
  const cookieUserId = cookieStore.get('cosmart_user_id')?.value

  const DEMO_OWNER_STORE_MAP: Record<string, string> = {
    'demo-owner-001': 'central-super',
    'demo-owner-002': 'banchan',
    'demo-owner-003': 'butcher',
    'demo-owner-004': 'bonjuk',
    'demo-owner-005': 'chicken',
    'demo-owner-006': 'bakery',
  }

  let storeId: string | null = null
  if (cookieRole === 'owner' && cookieUserId) {
    const { data: ownerUser } = await supabase.from('users').select('store_id').eq('id', cookieUserId).single()
    storeId = ownerUser?.store_id ?? DEMO_OWNER_STORE_MAP[cookieUserId] ?? null
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString()

  let todayQ      = supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', todayISO)
  let pendingQ    = supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending')
  let paidQ       = supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'paid')
  let deliveringQ = supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivering')
  let revenueQ    = supabase.from('orders').select('total_amount').gte('created_at', todayISO)

  if (storeId) {
    todayQ      = todayQ.eq('store_id', storeId)
    pendingQ    = pendingQ.eq('store_id', storeId)
    paidQ       = paidQ.eq('store_id', storeId)
    deliveringQ = deliveringQ.eq('store_id', storeId)
    revenueQ    = revenueQ.eq('store_id', storeId)
  }

  const [
    { count: todayOrders },
    { count: newOrders },
    { count: paidOrders },
    { count: delivering },
    { data: revenueData },
  ] = await Promise.all([
    todayQ,
    pendingQ,
    paidQ,
    deliveringQ,
    revenueQ,
  ])

  const todayRevenue = revenueData?.reduce((sum, o) => sum + (o.total_amount ?? 0), 0) ?? 0

  return NextResponse.json({
    data: {
      todayOrders: todayOrders ?? 0,
      pendingCount: newOrders ?? 0,
      paidCount: paidOrders ?? 0,
      deliveringCount: delivering ?? 0,
      todayRevenue,
    },
    error: null,
  })
}
