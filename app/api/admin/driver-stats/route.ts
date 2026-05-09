import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url?.startsWith('https') || !key) return null
  return createSupabaseClient(url, key)
}

// GET /api/admin/driver-stats — 배달맨별 배달 통계
export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  if (cookieStore.get('cosmart_role')?.value !== 'admin') {
    return NextResponse.json({ data: null, error: '권한 없음' }, { status: 403 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ data: {}, error: null })
  }

  try {
    // 모든 배달맨의 배달 목록 조회
    const { data: deliveries } = await supabase
      .from('deliveries')
      .select('driver_id, status')
      .not('driver_id', 'is', null)

    const stats: Record<string, { total: number; active: number; completed: number }> = {}

    if (deliveries) {
      deliveries.forEach((d: any) => {
        if (!d.driver_id) return
        if (!stats[d.driver_id]) stats[d.driver_id] = { total: 0, active: 0, completed: 0 }
        stats[d.driver_id].total++
        if (['assigned', 'picked_up', 'in_transit'].includes(d.status)) {
          stats[d.driver_id].active++
        }
        if (d.status === 'delivered') {
          stats[d.driver_id].completed++
        }
      })
    }

    return NextResponse.json({ data: stats, error: null })
  } catch {
    return NextResponse.json({ data: {}, error: null })
  }
}
