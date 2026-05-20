// 단순한 in-memory rate limiter (단일 서버 가정).
// 분산 환경(여러 인스턴스)에서는 Redis 등 외부 저장소가 필요하지만, 현재는 단일 Railway
// 인스턴스라 충분합니다. 인스턴스 재시작 시 상태 초기화는 의도된 동작.

interface Attempt {
  count: number
  firstAt: number
  blockedUntil: number
}

const buckets = new Map<string, Attempt>()

const WINDOW_MS = 10 * 60 * 1000          // 10분
const MAX_FAILURES = 8                     // 10분 내 8회 실패 시 차단
const BLOCK_MS = 15 * 60 * 1000            // 15분 차단
const MAX_BUCKETS = 5000                   // 메모리 보호 (사용자 수 적은 단계라 충분)

function gc(now: number) {
  if (buckets.size < MAX_BUCKETS) return
  for (const [k, v] of buckets) {
    if (v.blockedUntil < now && now - v.firstAt > WINDOW_MS) buckets.delete(k)
  }
}

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds?: number
  remaining?: number
}

/**
 * 로그인 시도 전 차단 여부 체크 (실패 카운트는 reset/record로 별도 관리).
 * key 예: `login:nickname:홍길동`, `login:ip:1.2.3.4`
 */
export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now()
  gc(now)
  const a = buckets.get(key)
  if (!a) return { allowed: true, remaining: MAX_FAILURES }
  if (a.blockedUntil > now) {
    return { allowed: false, retryAfterSeconds: Math.ceil((a.blockedUntil - now) / 1000) }
  }
  // 윈도우 만료 → 새 카운트로 재시작
  if (now - a.firstAt > WINDOW_MS) {
    buckets.delete(key)
    return { allowed: true, remaining: MAX_FAILURES }
  }
  return { allowed: true, remaining: Math.max(0, MAX_FAILURES - a.count) }
}

/** 실패 1회 기록. 임계치 도달 시 자동 차단 처리. */
export function recordFailure(key: string): RateLimitResult {
  const now = Date.now()
  const existing = buckets.get(key)
  if (!existing || now - existing.firstAt > WINDOW_MS) {
    buckets.set(key, { count: 1, firstAt: now, blockedUntil: 0 })
    return { allowed: true, remaining: MAX_FAILURES - 1 }
  }
  existing.count += 1
  if (existing.count >= MAX_FAILURES) {
    existing.blockedUntil = now + BLOCK_MS
    return { allowed: false, retryAfterSeconds: Math.ceil(BLOCK_MS / 1000) }
  }
  return { allowed: true, remaining: MAX_FAILURES - existing.count }
}

/** 로그인 성공 시 카운트 리셋. */
export function resetRateLimit(key: string) {
  buckets.delete(key)
}

/** 요청에서 클라이언트 IP 추출 (Railway/Cloudflare 프록시 뒤). */
export function getClientIp(headers: Headers): string {
  // Cloudflare → CF-Connecting-IP, Railway/Vercel → X-Forwarded-For
  const cf = headers.get('cf-connecting-ip')
  if (cf) return cf
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const real = headers.get('x-real-ip')
  if (real) return real
  return 'unknown'
}
