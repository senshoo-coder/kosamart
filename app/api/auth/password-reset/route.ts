import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'
import { isValidPasswordFormat } from '@/lib/utils/password'
import { normalizePhone, isValidPhone } from '@/lib/utils/phone'
import { notifyAdmin } from '@/lib/telegram/messages'

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

  if (!user) return failResponse
  if (!user.phone) return failResponse

  const storedPhoneNormalized = normalizePhone(user.phone)
  if (storedPhoneNormalized !== phoneNormalized) return failResponse

  const password_hash = await bcrypt.hash(newPassword, 10)
  const { error: updateError } = await supabase
    .from('users')
    .update({ password_hash })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ data: null, error: '비밀번호 변경 실패' }, { status: 500 })
  }

  // 관리자 알림 (감사 로그용)
  const msg = [
    `🔓 <b>[비밀번호 자가 재설정]</b>`,
    ``,
    `닉네임: <b>${nickname}</b>`,
    `역할: ${user.role}`,
    `전화: ${user.phone}`,
    `시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
  ].join('\n')
  notifyAdmin(msg).catch(() => {})

  return NextResponse.json({ data: { ok: true }, error: null })
}
