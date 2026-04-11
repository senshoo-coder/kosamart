import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https')

const DEMO_DRIVERS = [
  { id: 'demo-driver-001', nickname: '김기사', device_uuid: 'demo-uuid-driver', role: 'driver', phone: '010-1111-2222' },
  { id: 'demo-driver-002', nickname: '이기사', device_uuid: 'demo-uuid-driver2', role: 'driver', phone: '010-3333-4444' },
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role')

  if (isDemoMode) {
    const users = role ? DEMO_DRIVERS.filter(u => u.role === role) : DEMO_DRIVERS
    return NextResponse.json({ data: users, error: null })
  }

  const supabase = await createAdminClient()

  let query = supabase
    .from('users')
    .select('id, nickname, device_uuid, role, phone')
    .eq('is_active', true)
    .order('nickname')

  if (role) query = query.eq('role', role)

  const { data, error } = await query
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

  return NextResponse.json({ data, error: null })
}
