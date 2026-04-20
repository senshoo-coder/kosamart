import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

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
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ data: null, error: 'Not found' }, { status: 404 })
  }

  const { role = 'customer' } = await req.json().catch(() => ({}))
  const user = DEMO_USERS[role as keyof typeof DEMO_USERS] ?? DEMO_USERS.customer

  const cookieStore = await cookies()
  cookieStore.set('cosmart_user_id', user.id, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 })
  cookieStore.set('cosmart_role', user.role, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 })

  return NextResponse.json({ data: user, error: null })
}
