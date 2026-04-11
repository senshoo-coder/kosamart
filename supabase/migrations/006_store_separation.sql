-- =============================================
-- 006: 사장님 / 관리자 권한 분리
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- 1. users 테이블에 store_id 추가 (owner가 담당하는 상점가 가게 ID)
--    market-data.ts의 store id값과 매핑 (예: 'butcher', 'banchan' 등)
ALTER TABLE users ADD COLUMN IF NOT EXISTS store_id TEXT;

-- 2. orders 테이블에 store_id 추가 (상점가 주문에만 사용)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_name TEXT;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_users_store_id ON users(store_id);
