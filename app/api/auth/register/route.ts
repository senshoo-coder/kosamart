import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { notifyAdmin } from '@/lib/telegram/messages'

const ROLE_LABELS_REG: Record<string, string> = {
  customer: '고객',
  owner: '사장님',
  driver: '배달기사',
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { nickname, password, role = 'customer', phone, device_uuid } = body

  if (!nickname?.trim()) return NextResponse.json({ data: null, error: '닉네임을 입력해주세요' }, { status: 400 })
  if (!password || password.length < 6) return NextResponse.json({ data: null, error: '비밀번호는 6자 이상이어야 합니다' }, { status: 400 })
  if (!['customer', 'owner', 'driver'].includes(role)) {
    return NextResponse.json({ data: null, error: '유효하지 않은 역할입니다' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  // 닉네임 중복 확인
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('nickname', nickname.trim())
    .single()

  if (existing) {
    return NextResponse.json({ data: null, error: '이미 사용 중인 닉네임입니다' }, { status: 409 })
  }

  const password_hash = await bcrypt.hash(password, 10)

  // 고객은 즉시 활성, 사장님/기사는 승인 대기
  const status = role === 'customer' ? 'active' : 'pending'

  const { data: user, error } = await supabase
    .from('users')
    .insert({ nickname: nickname.trim(), password_hash, role, status, phone: phone?.trim() || null, device_uuid: device_uuid || null })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ data: null, error: '계정 생성 실패: ' + error.message }, { status: 500 })
  }

  if (status === 'pending') {
    // 관리자에게 텔레그램 알림 (실패해도 무시)
    const roleLabel = ROLE_LABELS_REG[role] ?? role
    const msg = [
      `🆕 <b>[신규 가입 신청]</b>`,
      ``,
      `역할: <b>${roleLabel}</b>`,
      `닉네임: <b>${user.nickname}</b>`,
      phone ? `연락처: ${phone}` : null,
      `신청 시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
      ``,
      `→ 관리자 화면 → 사용자 관리 → 승인 대기 탭에서 승인 처리해 주세요.`,
    ].filter(Boolean).join('\n')
    await notifyAdmin(msg).catch(() => {})

    return NextResponse.json({
      data: { pending: true, nickname: user.nickname, role: user.role },
      error: null,
      message: '회원가입 신청이 완료되었습니다. 관리자 승인 후 로그인 가능합니다.',
    })
  }

  // 고객은 바로 로그인 처리
  const cookieStore = await cookies()
  cookieStore.set('cosmart_user_id', user.id, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 })
  cookieStore.set('cosmart_role', user.role, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 })

  return NextResponse.json({
    data: { id: user.id, nickname: user.nickname, device_uuid: user.device_uuid, role: user.role },
    error: null,
  })
}
