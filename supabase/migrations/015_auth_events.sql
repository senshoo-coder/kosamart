-- 015_auth_events.sql
-- 로그인 시도·비밀번호 재설정 등 인증 이벤트 감사 로그.
-- 포렌식·이상행위 탐지·BFF 신고용. 90일 후 PII purge 시 ip_hash·user_agent NULL.
--
-- 적용 후 app/api/auth/route.ts 및 app/api/auth/password-reset/route.ts 가
-- 자동으로 이 테이블에 insert 합니다. 테이블이 없으면 insert가 조용히 실패하니
-- 점진적 배포 가능 (테이블 없어도 로그인은 작동).

CREATE TABLE IF NOT EXISTS auth_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT NOT NULL CHECK (event_type IN (
    'login_success',
    'login_failure',
    'login_blocked_rate_limit',
    'login_blocked_role_mismatch',
    'login_blocked_pending',
    'login_blocked_suspended',
    'password_reset_self',
    'password_reset_request',
    'password_reset_admin'
  )),
  nickname    TEXT,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  role        TEXT,
  -- 원본 IP 대신 해시 저장 (개인정보 최소화). 같은 IP는 같은 해시.
  ip_hash     TEXT,
  user_agent  TEXT,
  detail      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_events_nickname ON auth_events(nickname, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_events_user_id ON auth_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_events_type ON auth_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_events_created ON auth_events(created_at);

-- 비관리자 RLS 차단 (관리자 콘솔에서만 조회 가능하도록)
ALTER TABLE auth_events ENABLE ROW LEVEL SECURITY;
-- 정책 없음 = service-role 클라이언트만 접근 가능 (현재 앱 구조와 일치)
