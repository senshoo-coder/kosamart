import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyAdmin } from '@/lib/telegram/messages'

const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https') ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY

const ROLE_LABELS: Record<string, string> = {
  customer: '고객',
  owner: '사장님',
  driver: '배달맨',
  admin: '관리자',
}

// POST /api/auth/password-reset-request
// 비밀번호 찾기 요청 — 관리자에게 텔레그램 알림 발송
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const nickname = (body.nickname || '').trim()
  const contact = (body.contact || '').trim() // 전화번호 또는 추가 정보 (선택)
  const note = (body.note || '').trim() // 사용자 메모 (선택)

  if (!nickname) {
    return NextResponse.json({ data: null, error: '닉네임을 입력해주세요' }, { status: 400 })
  }

  // 사용자 존재 여부 확인 (있으면 role 정보 포함, 없어도 동일한 응답 — 정보 노출 방지)
  let foundRole: string | null = null
  if (!isDemoMode) {
    try {
      const supabase = await createAdminClient()
      const { data: user } = await supabase.from('users').select('role').eq('nickname', nickname).single()
      foundRole = user?.role ?? null
    } catch {}
  }

  const roleLabel = foundRole ? (ROLE_LABELS[foundRole] ?? foundRole) : '확인 필요'

  const msg = [
    `🔑 <b>[비밀번호 재설정 요청]</b>`,
    ``,
    `닉네임: <b>${nickname}</b>`,
    `역할: ${roleLabel}`,
    contact ? `연락처: ${contact}` : null,
    note ? `메모: ${note}` : null,
    `요청 시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
    ``,
    `→ 관리자 화면 → 사용자 관리에서 비밀번호 재설정 후 본인 확인 절차에 따라 전달해 주세요.`,
  ].filter(Boolean).join('\n')

  await notifyAdmin(msg).catch(() => {})

  // 보안: 사용자 존재 여부와 무관하게 동일한 성공 응답 (열거 공격 방지)
  return NextResponse.json({
    data: { ok: true },
    error: null,
  })
}
