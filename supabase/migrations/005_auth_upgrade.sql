-- =============================================
-- 005: 개인 비밀번호 인증 체계 전환
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- 1. user_role에 admin 추가
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';

-- 2. users 테이블에 password_hash, status 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('pending', 'active', 'suspended'));

-- 3. device_uuid nullable로 변경 (관리자가 직접 생성하는 계정은 device_uuid 없음)
ALTER TABLE users ALTER COLUMN device_uuid DROP NOT NULL;

-- 4. nickname에 UNIQUE 제약 추가
--    (기존 중복 닉네임이 있으면 먼저 정리 필요)
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS users_nickname_unique UNIQUE(nickname);

-- 5. 기존 users 상태 active로 통일
UPDATE users SET status = 'active' WHERE status IS NULL OR status = '';

-- =============================================
-- 최초 admin 계정 생성
-- 비밀번호는 배포 후 /admin/users 페이지에서 변경하거나
-- 아래 password_hash를 bcrypt hash로 교체하세요.
-- 기본 비밀번호: cosmart2024  (반드시 변경!)
-- bcrypt hash: $2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0YeV/1a2qK6
-- =============================================
INSERT INTO users (device_uuid, nickname, role, status, password_hash)
VALUES (
  gen_random_uuid()::text,
  'admin',
  'admin',
  'active',
  '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0YeV/1a2qK6'
)
ON CONFLICT (nickname) DO UPDATE SET
  role = 'admin',
  status = 'active',
  password_hash = EXCLUDED.password_hash;
