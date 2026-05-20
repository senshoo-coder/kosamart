import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'
import { isValidPasswordFormat } from '@/lib/utils/password'
import { normalizePhone, isValidPhone } from '@/lib/utils/phone'
import { notifyAdmin, escapeHtml as e } from '@/lib/telegram/messages'
import { checkRateLimit, recordFailure, resetRateLimit, getClientIp } from '@/lib/auth/rate-limit'
import { logAuthEvent } from '@/lib/audit/auth-events'

const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https') ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY

// POST /api/auth/password-reset
// body: { nickname, phone, new_password }
// 닉네임 + 가입 시 등록한 전화번호가 일치하면 비밀번호 변경 (자가 재설정).
export async function POST(req: NextRequest) {
  if (isDemoMode) {
    return NextResponse.json({ data: null, error: '데모 모드에서는 사용할 수 없습니다' }, { status: 503 })
  }

  const body = await req.json().catch(() => ({}))
  const nickname = (body.nickname || '').trim()
  const phoneNormalized = normalizePhone(body.phone)
  const newPassword = String(body.new_password || '')

  if (!nickname) {
    return NextResponse.json({ data: null, error: '닉네임을 입력해주세요' }, { status: 400 })
  }
  if (!phoneNormalized || !isValidPhone(phoneNormalized)) {
    return NextResponse.json({ data: null, error: '가입 시 등록한 전화번호를 입력해주세요' }, { status: 400 })
  }
  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json({ data: null, error: '새 비밀번호는 6자 이상이어야 합니다' }, { status: 400 })
  }
  if (!isValidPasswordFormat(newPassword)) {
    return NextResponse.json({ data: null, error: '비밀번호는 영문·숫자·특수기호만 사용 가능합니다 (한글 불가)' }, { status: 400 })
  }

  // Rate limit: 자가 재설정도 무차별 시도 차단
  const ip = getClientIp(req.headers)
  const userAgent = req.headers.get('user-agent') || null
  const nickKey = `pwreset:nick:${nickname.toLowerCase()}`
  const ipKey = `pwreset:ip:${ip}`
  const nickCheck = checkRateLimit(nickKey)
  const ipCheck = checkRateLimit(ipKey)
  if (!nickCheck.allowed || !ipCheck.allowed) {
    const retry = Math.max(nickCheck.retryAfterSeconds ?? 0, ipCheck.retryAfterSeconds ?? 0)
    logAuthEvent({ event_type: 'login_blocked_rate_limit', nickname, ip, user_agent: userAgent, detail: 'password-reset rate limited' })
    return NextResponse.json(
      { data: null, error: `너무 많은 시도. ${Math.ceil(retry / 60)}분 후 다시 시도해 주세요` },
      { status: 429, headers: { 'Retry-After': String(retry) } }
    )
  }

  const supabase = await createAdminClient()
  const { data: user } = await supabase
    .from('users')
    .select('id, nickname, role, phone')
    .eq('nickname', nickname)
    .single()

  // 보안: 사용자 존재 여부와 무관하게 동일 응답 (열거 공격 방지)
  const failResponse = NextResponse.json(
    { data: null, error: '닉네임 또는 전화번호가 일치하지 않습니다' },
    { status: 401 }
  )

  if (!user || !user.phone) {
    recordFailure(nickKey); recordFailure(ipKey)
    logAuthEvent({ event_type: 'login_failure', nickname, ip, user_agent: userAgent, detail: 'pwreset: no user or phone' })
    return failResponse
  }

  const storedPhoneNormalized = normalizePhone(user.phone)
  if (storedPhoneNormalized !== phoneNormalized) {
    recordFailure(nickKey); recordFailure(ipKey)
    logAuthEvent({ event_type: 'login_failure', nickname, user_id: user.id, role: user.role, ip, user_agent: userAgent, detail: 'pwreset: phone mismatch' })
    return failResponse
  }

  const password_hash = await bcrypt.hash(newPassword, 10)
  const { error: updateError } = await supabase
    .from('users')
    .update({ password_hash })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ data: null, error: '비밀번호 변경 실패' }, { status: 500 })
  }

  // 성공: 카운트 리셋 + 감사 로그
  resetRateLimit(nickKey); resetRateLimit(ipKey)
  logAuthEvent({ event_type: 'password_reset_self', nickname, user_id: user.id, role: user.role, ip, user_agent: userAgent })

  // 관리자 알림 (감사 로그용)
  const msg = [
    `🔓 <b>[비밀번호 자가 재설정]</b>`,
    ``,
    `닉네임: <b>${e(nickname)}</b>`,
    `역할: ${e(user.role)}`,
    `전화: ${e(user.phone)}`,
    `시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
  ].join('\n')
  notifyAdmin(msg).catch(() => {})

  return NextResponse.json({ data: { ok: true }, error: null })
}
