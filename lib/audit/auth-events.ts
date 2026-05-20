import { createAdminClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'

// 인증 이벤트 감사 로그 헬퍼.
// auth_events 테이블이 없어도 (마이그레이션 015 미적용 환경) 조용히 실패합니다.

export type AuthEventType =
  | 'login_success'
  | 'login_failure'
  | 'login_blocked_rate_limit'
  | 'login_blocked_role_mismatch'
  | 'login_blocked_pending'
  | 'login_blocked_suspended'
  | 'password_reset_self'
  | 'password_reset_request'
  | 'password_reset_admin'

interface LogAuthEventOpts {
  event_type: AuthEventType
  nickname?: string | null
  user_id?: string | null
  role?: string | null
  ip?: string | null
  user_agent?: string | null
  detail?: string | null
}

const IP_SALT = process.env.AUTH_EVENT_IP_SALT || 'kosamart-dev-default-salt'

function hashIp(ip: string | null | undefined): string | null {
  if (!ip || ip === 'unknown') return null
  return createHash('sha256').update(`${IP_SALT}:${ip}`).digest('hex').slice(0, 32)
}

export async function logAuthEvent(opts: LogAuthEventOpts): Promise<void> {
  try {
    const supabase = await createAdminClient()
    await supabase.from('auth_events').insert({
      event_type: opts.event_type,
      nickname: opts.nickname?.slice(0, 100) ?? null,
      user_id: opts.user_id ?? null,
      role: opts.role ?? null,
      ip_hash: hashIp(opts.ip),
      user_agent: opts.user_agent?.slice(0, 300) ?? null,
      detail: opts.detail?.slice(0, 500) ?? null,
    })
  } catch {
    // 감사 로그 실패는 본 흐름 중단하지 않음
  }
}
