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

// 환경변수 누락 시 production에서는 IP 해시를 저장 안 함 (약한 salt로 인한 역추론 방지).
// dev/local 에서만 fallback salt 사용 (테스트 편의).
const IP_SALT = process.env.AUTH_EVENT_IP_SALT || ''
const IS_PROD = process.env.NODE_ENV === 'production'

function hashIp(ip: string | null | undefined): string | null {
  if (!ip || ip === 'unknown') return null
  if (!IP_SALT) {
    if (IS_PROD) return null // production에서 salt 없으면 해시 자체를 안 남김
    return createHash('sha256').update(`dev-salt:${ip}`).digest('hex').slice(0, 32)
  }
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
