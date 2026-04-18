-- =============================================
-- 012: 개인정보 자동 파기 (개인정보보호법 준수)
-- =============================================

-- 파기 시점 추적용 컬럼 추가
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pii_deleted_at TIMESTAMPTZ;
ALTER TABLE users  ADD COLUMN IF NOT EXISTS pii_deleted_at TIMESTAMPTZ;

-- =============================================
-- 익명화 함수 — orders
-- 전화번호, 배달주소, 메모를 '[파기됨]'으로 대체
-- 주문번호·금액·매장정보는 전자상거래법상 5년 보존
-- =============================================
CREATE OR REPLACE FUNCTION anonymize_order_pii(target_order_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE orders
  SET
    kakao_nickname   = '[파기됨]',
    customer_phone   = NULL,
    delivery_address = '[파기됨]',
    delivery_memo    = NULL,
    owner_memo       = NULL,
    pii_deleted_at   = now()
  WHERE id = target_order_id
    AND pii_deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 익명화 함수 — users
-- 전화번호, device_uuid를 제거 (계정 식별 차단)
-- 닉네임은 '[탈퇴]'로 변경
-- =============================================
CREATE OR REPLACE FUNCTION anonymize_user_pii(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET
    nickname         = '[탈퇴]',
    phone            = NULL,
    device_uuid      = gen_random_uuid()::text,  -- 기기 연결 차단
    telegram_chat_id = NULL,
    pii_deleted_at   = now()
  WHERE id = target_user_id
    AND pii_deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- pg_cron ①: 매월 1일 새벽 2시
-- 5년 경과 주문 PII 익명화 (전자상거래법 보유기간 만료)
-- =============================================
SELECT cron.schedule(
  'purge-expired-order-pii',
  '0 2 1 * *',
  $$
  SELECT anonymize_order_pii(id)
  FROM orders
  WHERE created_at < now() - interval '5 years'
    AND pii_deleted_at IS NULL;
  $$
);

-- =============================================
-- pg_cron ②: 매주 월요일 새벽 3시
-- 배달 완료 후 90일 경과 주문의 배달주소·연락처 파기
-- (분쟁 해결 버퍼 90일 확보 후 삭제)
-- =============================================
SELECT cron.schedule(
  'purge-delivered-order-pii',
  '0 3 * * 1',
  $$
  SELECT anonymize_order_pii(o.id)
  FROM orders o
  JOIN deliveries d ON d.order_id = o.id
  WHERE d.status = 'delivered'
    AND d.delivered_at < now() - interval '90 days'
    AND o.pii_deleted_at IS NULL;
  $$
);

-- =============================================
-- pg_cron ③: 매월 1일 새벽 4시
-- 1년간 주문 없는 비활성 고객 PII 익명화
-- =============================================
SELECT cron.schedule(
  'purge-inactive-user-pii',
  '0 4 1 * *',
  $$
  SELECT anonymize_user_pii(u.id)
  FROM users u
  WHERE u.role = 'customer'
    AND u.pii_deleted_at IS NULL
    AND u.updated_at < now() - interval '1 year'
    AND NOT EXISTS (
      SELECT 1 FROM orders o
      WHERE o.customer_id = u.id
        AND o.created_at > now() - interval '1 year'
    );
  $$
);
