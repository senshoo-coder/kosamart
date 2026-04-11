import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// 데모/테스트용 — Supabase 없이 바로 로그인
const DEMO_USERS = {
  customer: {
    id: 'demo-customer-001',
    nickname: '테스트고객',
    device_uuid: 'demo-uuid-customer',
    role: 'customer' as const,
  },
  owner: {
    id: 'demo-owner-001',
    nickname: '사장님',
    device_uuid: 'demo-uuid-owner',
    role: 'owner' as const,
  },
  driver: {
    id: 'demo-driver-001',
    nickname: '배달기사',
    device_uuid: 'demo-uuid-driver',
    role: 'driver' as const,
  },
}

export async function POST(req: NextRequest) {
  const { role = 'customer' } = await req.json().catch(() => ({}))
  const user = DEMO_USERS[role as keyof typeof DEMO_USERS] ?? DEMO_USERS.customer

  const cookieStore = await cookies()
  cookieStore.set('cosmart_user_id', user.id, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 })
  cookieStore.set('cosmart_role', user.role, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 })

  return NextResponse.json({ data: user, error: null })
}
