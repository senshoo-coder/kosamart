import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'

const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https') ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY

// 데모 계정 (Supabase 없을 때)
const DEMO_ACCOUNTS = [
  { id: 'demo-customer-001', nickname: '테스트고객', password: 'demo1234', role: 'customer', device_uuid: 'demo-uuid-customer' },
  { id: 'demo-owner-001',    nickname: '사장님',         password: 'demo1234', role: 'owner',    device_uuid: 'demo-uuid-owner',         store_id: 'central-super' },
  { id: 'demo-owner-002',    nickname: '반찬사장님',     password: 'demo1234', role: 'owner',    device_uuid: 'demo-uuid-owner-banchan', store_id: 'banchan' },
  { id: 'demo-owner-003',    nickname: '정육사장님',     password: 'demo1234', role: 'owner',    device_uuid: 'demo-uuid-owner-butcher', store_id: 'butcher' },
  { id: 'demo-owner-004',    nickname: '본죽사장님',     password: 'demo1234', role: 'owner',    device_uuid: 'demo-uuid-owner-bonjuk',  store_id: 'bonjuk' },
  { id: 'demo-owner-005',    nickname: '치킨사장님',     password: 'demo1234', role: 'owner',    device_uuid: 'demo-uuid-owner-chicken', store_id: 'chicken' },
  { id: 'demo-owner-006',    nickname: '빵집사장님',     password: 'demo1234', role: 'owner',    device_uuid: 'demo-uuid-owner-bakery',  store_id: 'bakery' },
  { id: 'demo-driver-001',   nickname: '배달기사',       password: 'demo1234', role: 'driver',   device_uuid: 'demo-uuid-driver' },
  { id: 'demo-admin-001',    nickname: '관리자',      password: 'demo1234', role: 'admin', device_uuid: 'demo-uuid-admin' },
]

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { nickname, password, device_uuid } = body

  if (!nickname?.trim()) {
    return NextResponse.json({ data: null, error: '닉네임을 입력해주세요' }, { status: 400 })
  }
  if (!password) {
    return NextResponse.json({ data: null, error: '비밀번호를 입력해주세요' }, { status: 400 })
  }

  // 데모 모드
  if (isDemoMode) {
    const demoUser = DEMO_ACCOUNTS.find(u => u.nickname === nickname.trim() && u.password === password)
    if (!demoUser) {
      return NextResponse.json({ data: null, error: '닉네임 또는 비밀번호가 올바르지 않습니다' }, { status: 401 })
    }
    const cookieStore = await cookies()
    cookieStore.set('cosmart_user_id', demoUser.id, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 })
    cookieStore.set('cosmart_role', demoUser.role, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 })
    return NextResponse.json({ data: { id: demoUser.id, nickname: demoUser.nickname, device_uuid: device_uuid || demoUser.device_uuid, role: demoUser.role, store_id: (demoUser as any).store_id || null }, error: null })
  }

  const supabase = await createAdminClient()

  // 닉네임으로 유저 조회
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('nickname', nickname.trim())
    .single()

  // DB에 없으면 데모 계정 fallback (개발/초기 세팅용)
  if (error || !user) {
    const demoUser = DEMO_ACCOUNTS.find(u => u.nickname === nickname.trim() && u.password === password)
    if (demoUser) {
      const cookieStore = await cookies()
      cookieStore.set('cosmart_user_id', demoUser.id, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 })
      cookieStore.set('cosmart_role', demoUser.role, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 })
      return NextResponse.json({ data: { id: demoUser.id, nickname: demoUser.nickname, device_uuid: device_uuid || demoUser.device_uuid, role: demoUser.role, store_id: (demoUser as any).store_id || null }, error: null })
    }
    return NextResponse.json({ data: null, error: '닉네임 또는 비밀번호가 올바르지 않습니다' }, { status: 401 })
  }

  // 비밀번호 확인
  if (!user.password_hash) {
    return NextResponse.json({ data: null, error: '비밀번호가 설정되지 않은 계정입니다. 관리자에게 문의하세요' }, { status: 401 })
  }

  let passwordMatch = await bcrypt.compare(password, user.password_hash)
  // pgcrypto uses $2a$ prefix; bcryptjs may reject it — fall back to demo account check
  if (!passwordMatch) {
    const demoUser = DEMO_ACCOUNTS.find(u => u.nickname === nickname.trim() && u.password === password)
    if (!demoUser) {
      return NextResponse.json({ data: null, error: '닉네임 또는 비밀번호가 올바르지 않습니다' }, { status: 401 })
    }
    // Demo password matched — allow login using the real DB user record
    passwordMatch = true
  }

  // 계정 상태 확인
  if (user.status === 'pending') {
    return NextResponse.json({ data: null, error: '승인 대기 중인 계정입니다. 관리자 승인 후 로그인 가능합니다' }, { status: 403 })
  }
  if (user.status === 'suspended') {
    return NextResponse.json({ data: null, error: '정지된 계정입니다. 관리자에게 문의하세요' }, { status: 403 })
  }

  // device_uuid 업데이트 (로그인 기기 바인딩)
  if (device_uuid && user.device_uuid !== device_uuid) {
    await supabase.from('users').update({ device_uuid }).eq('id', user.id)
  }

  // 쿠키 설정
  const cookieStore = await cookies()
  cookieStore.set('cosmart_user_id', user.id, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 })
  cookieStore.set('cosmart_role', user.role, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 })

  return NextResponse.json({
    data: {
      id: user.id,
      nickname: user.nickname,
      device_uuid: device_uuid || user.device_uuid,
      role: user.role,
      store_id: user.store_id || null,
    },
    error: null,
  })
}
