import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { checkRateLimit, recordFailure, resetRateLimit, getClientIp } from '@/lib/auth/rate-limit'
import { logAuthEvent } from '@/lib/audit/auth-events'

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
  { id: 'demo-driver-001',   nickname: '배달맨',       password: 'demo1234', role: 'driver',   device_uuid: 'demo-uuid-driver' },
  { id: 'demo-admin-001',    nickname: '관리자',      password: 'demo1234', role: 'admin', device_uuid: 'demo-uuid-admin' },
]

const ROLE_LABELS: Record<string, string> = {
  customer: '고객',
  owner: '사장님',
  driver: '배달맨',
  admin: '관리자',
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { nickname, password, device_uuid, expected_role } = body

  if (!nickname?.trim()) {
    return NextResponse.json({ data: null, error: '닉네임을 입력해주세요' }, { status: 400 })
  }
  if (!password) {
    return NextResponse.json({ data: null, error: '비밀번호를 입력해주세요' }, { status: 400 })
  }

  // Rate limiting: per-nickname + per-IP
  const cleanNickname = nickname.trim()
  const ip = getClientIp(req.headers)
  const userAgent = req.headers.get('user-agent') || null
  const nickKey = `login:nick:${cleanNickname.toLowerCase()}`
  const ipKey = `login:ip:${ip}`
  const nickCheck = checkRateLimit(nickKey)
  const ipCheck = checkRateLimit(ipKey)
  if (!nickCheck.allowed || !ipCheck.allowed) {
    const retry = Math.max(nickCheck.retryAfterSeconds ?? 0, ipCheck.retryAfterSeconds ?? 0)
    logAuthEvent({
      event_type: 'login_blocked_rate_limit',
      nickname: cleanNickname, ip, user_agent: userAgent,
      detail: `retryAfter=${retry}s nickRetry=${nickCheck.retryAfterSeconds ?? 0} ipRetry=${ipCheck.retryAfterSeconds ?? 0}`,
    })
    return NextResponse.json(
      { data: null, error: `너무 많은 로그인 시도. ${Math.ceil(retry / 60)}분 후 다시 시도해 주세요` },
      { status: 429, headers: { 'Retry-After': String(retry) } }
    )
  }

  // 선택한 역할과 실제 계정 역할이 다르면 차단
  // (보안: 실제 역할을 노출하지 않음 — 계정 열거 공격 방지)
  function checkRoleMatch(actualRole: string): NextResponse | null {
    if (expected_role && expected_role !== actualRole) {
      const want = ROLE_LABELS[expected_role] ?? expected_role
      return NextResponse.json(
        { data: null, error: `${want} 계정이 아닙니다. 올바른 역할 탭에서 다시 시도해 주세요` },
        { status: 403 }
      )
    }
    return null
  }

  // 데모 모드
  if (isDemoMode) {
    const demoUser = DEMO_ACCOUNTS.find(u => u.nickname === nickname.trim() && u.password === password)
    if (!demoUser) {
      recordFailure(nickKey); recordFailure(ipKey)
      logAuthEvent({ event_type: 'login_failure', nickname: cleanNickname, ip, user_agent: userAgent, detail: 'demo-mode no match' })
      return NextResponse.json({ data: null, error: '닉네임 또는 비밀번호가 올바르지 않습니다' }, { status: 401 })
    }
    const roleErr = checkRoleMatch(demoUser.role)
    if (roleErr) {
      logAuthEvent({ event_type: 'login_blocked_role_mismatch', nickname: cleanNickname, user_id: demoUser.id, role: demoUser.role, ip, user_agent: userAgent, detail: `expected=${expected_role}` })
      return roleErr
    }
    resetRateLimit(nickKey); resetRateLimit(ipKey)
    logAuthEvent({ event_type: 'login_success', nickname: cleanNickname, user_id: demoUser.id, role: demoUser.role, ip, user_agent: userAgent, detail: 'demo-mode' })
    const cookieStore = await cookies()
    const secure = process.env.NODE_ENV === 'production'
    cookieStore.set('cosmart_user_id', demoUser.id, { httpOnly: true, sameSite: 'lax', secure, maxAge: 60 * 60 * 24 * 30 })
    cookieStore.set('cosmart_role', demoUser.role, { httpOnly: true, sameSite: 'lax', secure, maxAge: 60 * 60 * 24 * 30 })
    return NextResponse.json({ data: { id: demoUser.id, nickname: demoUser.nickname, device_uuid: device_uuid || demoUser.device_uuid, role: demoUser.role, store_id: (demoUser as { store_id?: string }).store_id || null }, error: null })
  }

  const supabase = await createAdminClient()

  // 닉네임으로 유저 조회
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('nickname', nickname.trim())
    .single()

  // DB에 없으면 데모 계정 fallback (개발 환경 전용)
  if (error || !user) {
    if (process.env.NODE_ENV !== 'production') {
      const demoUser = DEMO_ACCOUNTS.find(u => u.nickname === nickname.trim() && u.password === password)
      if (demoUser) {
        const roleErr = checkRoleMatch(demoUser.role)
        if (roleErr) {
          logAuthEvent({ event_type: 'login_blocked_role_mismatch', nickname: cleanNickname, user_id: demoUser.id, role: demoUser.role, ip, user_agent: userAgent, detail: `expected=${expected_role} (demo fallback)` })
          return roleErr
        }
        resetRateLimit(nickKey); resetRateLimit(ipKey)
        logAuthEvent({ event_type: 'login_success', nickname: cleanNickname, user_id: demoUser.id, role: demoUser.role, ip, user_agent: userAgent, detail: 'demo fallback' })
        const cookieStore = await cookies()
        // 이 블록은 NODE_ENV !== 'production' 안이라 secure=false로 두는 게 맞음 (dev 환경 fallback)
        cookieStore.set('cosmart_user_id', demoUser.id, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 })
        cookieStore.set('cosmart_role', demoUser.role, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 })
        return NextResponse.json({ data: { id: demoUser.id, nickname: demoUser.nickname, device_uuid: device_uuid || demoUser.device_uuid, role: demoUser.role, store_id: (demoUser as { store_id?: string }).store_id || null }, error: null })
      }
    }
    recordFailure(nickKey); recordFailure(ipKey)
    logAuthEvent({ event_type: 'login_failure', nickname: cleanNickname, ip, user_agent: userAgent, detail: 'no such user' })
    return NextResponse.json({ data: null, error: '닉네임 또는 비밀번호가 올바르지 않습니다' }, { status: 401 })
  }

  // 비밀번호 확인
  if (!user.password_hash) {
    recordFailure(nickKey); recordFailure(ipKey)
    logAuthEvent({ event_type: 'login_failure', nickname: cleanNickname, user_id: user.id, role: user.role, ip, user_agent: userAgent, detail: 'no password hash' })
    return NextResponse.json({ data: null, error: '비밀번호가 설정되지 않은 계정입니다. 관리자에게 문의하세요' }, { status: 401 })
  }

  let passwordMatch = await bcrypt.compare(password, user.password_hash)
  // pgcrypto uses $2a$ prefix; bcryptjs may reject it — fall back to demo account check (dev only)
  if (!passwordMatch && process.env.NODE_ENV !== 'production') {
    const demoUser = DEMO_ACCOUNTS.find(u => u.nickname === nickname.trim() && u.password === password)
    if (demoUser) passwordMatch = true
  }
  if (!passwordMatch) {
    recordFailure(nickKey); recordFailure(ipKey)
    logAuthEvent({ event_type: 'login_failure', nickname: cleanNickname, user_id: user.id, role: user.role, ip, user_agent: userAgent, detail: 'password mismatch' })
    return NextResponse.json({ data: null, error: '닉네임 또는 비밀번호가 올바르지 않습니다' }, { status: 401 })
  }

  // 선택한 역할과 실제 계정 역할 일치 검증
  const roleErr = checkRoleMatch(user.role)
  if (roleErr) {
    logAuthEvent({ event_type: 'login_blocked_role_mismatch', nickname: cleanNickname, user_id: user.id, role: user.role, ip, user_agent: userAgent, detail: `expected=${expected_role}` })
    return roleErr
  }

  // 계정 상태 확인
  if (user.status === 'pending') {
    logAuthEvent({ event_type: 'login_blocked_pending', nickname: cleanNickname, user_id: user.id, role: user.role, ip, user_agent: userAgent })
    return NextResponse.json({ data: null, error: '승인 대기 중인 계정입니다. 관리자 승인 후 로그인 가능합니다' }, { status: 403 })
  }
  if (user.status === 'suspended') {
    logAuthEvent({ event_type: 'login_blocked_suspended', nickname: cleanNickname, user_id: user.id, role: user.role, ip, user_agent: userAgent })
    return NextResponse.json({ data: null, error: '정지된 계정입니다. 관리자에게 문의하세요' }, { status: 403 })
  }

  // 성공: 실패 카운트 리셋 + 감사 로그
  resetRateLimit(nickKey); resetRateLimit(ipKey)
  logAuthEvent({ event_type: 'login_success', nickname: cleanNickname, user_id: user.id, role: user.role, ip, user_agent: userAgent })

  // device_uuid 업데이트 (로그인 기기 바인딩)
  if (device_uuid && user.device_uuid !== device_uuid) {
    await supabase.from('users').update({ device_uuid }).eq('id', user.id)
  }

  // 쿠키 설정
  const secure = process.env.NODE_ENV === 'production'
  const cookieStore = await cookies()
  cookieStore.set('cosmart_user_id', user.id, { httpOnly: true, sameSite: 'lax', secure, maxAge: 60 * 60 * 24 * 30 })
  cookieStore.set('cosmart_role', user.role, { httpOnly: true, sameSite: 'lax', secure, maxAge: 60 * 60 * 24 * 30 })

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
