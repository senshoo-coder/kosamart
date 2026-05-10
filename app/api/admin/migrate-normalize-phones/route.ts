import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import { normalizePhone } from '@/lib/utils/phone'

// 일회성: users 테이블의 phone 값을 모두 숫자만 남도록 정규화
// "010-1234-5678" → "01012345678", "010 1234 5678" → "01012345678" 등.

export async function POST() {
  const cookieStore = await cookies()
  if (cookieStore.get('cosmart_role')?.value !== 'admin') {
    return NextResponse.json({ error: '관리자 전용' }, { status: 403 })
  }

  const supabase = await createAdminClient()
  const { data: users, error } = await supabase
    .from('users')
    .select('id, nickname, phone')
    .not('phone', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const changes: { id: string; nickname: string; from: string; to: string }[] = []
  let unchanged = 0

  for (const u of users ?? []) {
    if (!u.phone) continue
    const normalized = normalizePhone(u.phone)
    if (normalized === u.phone) { unchanged++; continue }
    const { error: upErr } = await supabase
      .from('users')
      .update({ phone: normalized || null })
      .eq('id', u.id)
    if (upErr) continue
    changes.push({ id: u.id, nickname: u.nickname, from: u.phone, to: normalized })
  }

  return NextResponse.json({
    data: {
      changed_count: changes.length,
      unchanged_count: unchanged,
      total: (users ?? []).length,
      changes,
    },
    error: null,
  })
}
