-- =============================================
-- pg_cron 자동화 작업
-- =============================================

-- ① 5분마다: 30분 이상 입금 미확인 → 텔레그램 알림
SELECT cron.schedule(
  'remind-pending-orders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.webhook_url') || '/api/webhooks/cron/pending-reminder',
    body := '{}',
    headers := '{"Content-Type":"application/json","x-cron-secret":"' || current_setting('app.cron_secret') || '"}'::jsonb
  )
  WHERE EXISTS (
    SELECT 1 FROM orders
    WHERE status = 'pending'
      AND created_at < now() - interval '30 minutes'
  );
  $$
);

-- ② 매일 오전 9시: 공구 오픈 공지
SELECT cron.schedule(
  'daily-open-notice',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.webhook_url') || '/api/webhooks/cron/daily-open',
    body := '{}',
    headers := '{"Content-Type":"application/json","x-cron-secret":"' || current_setting('app.cron_secret') || '"}'::jsonb
  );
  $$
);

-- ③ 매일 오후 5시: 마감 1시간 전 긴급 공지
SELECT cron.schedule(
  'closing-notice',
  '0 17 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.webhook_url') || '/api/webhooks/cron/closing-notice',
    body := '{}',
    headers := '{"Content-Type":"application/json","x-cron-secret":"' || current_setting('app.cron_secret') || '"}'::jsonb
  );
  $$
);

-- ④ 매일 오후 11시: 일일 정산 리포트
SELECT cron.schedule(
  'daily-sales-report',
  '0 23 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.webhook_url') || '/api/webhooks/cron/daily-report',
    body := '{}',
    headers := '{"Content-Type":"application/json","x-cron-secret":"' || current_setting('app.cron_secret') || '"}'::jsonb
  );
  $$
);

-- ⑤ 매일 자정: 마감시간 지난 공구 자동 closed 처리
SELECT cron.schedule(
  'auto-close-group-buys',
  '0 0 * * *',
  $$
  UPDATE group_buys
  SET status = 'closed', updated_at = now()
  WHERE status = 'active'
    AND order_deadline IS NOT NULL
    AND order_deadline < now();
  $$
);

-- ⑥ 매일 자정: 3일 이상 미입금 주문 자동 취소
SELECT cron.schedule(
  'auto-cancel-expired-orders',
  '5 0 * * *',
  $$
  UPDATE orders
  SET status = 'cancelled', owner_memo = '자동취소: 3일 미입금', updated_at = now()
  WHERE status = 'pending'
    AND created_at < now() - interval '3 days';
  $$
);

-- ⑦ 매시간: 배송 지연 감지 (1시간 이상 배달중)
SELECT cron.schedule(
  'delivery-delay-check',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.webhook_url') || '/api/webhooks/cron/delay-check',
    body := '{}',
    headers := '{"Content-Type":"application/json","x-cron-secret":"' || current_setting('app.cron_secret') || '"}'::jsonb
  )
  WHERE EXISTS (
    SELECT 1 FROM deliveries
    WHERE status = 'delivering'
      AND picked_up_at < now() - interval '1 hour'
  );
  $$
);

-- =============================================
-- pg_net 트리거: 주문 상태 변경 시 웹훅 호출
-- =============================================
CREATE OR REPLACE FUNCTION notify_order_status_via_webhook()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM net.http_post(
      url     := current_setting('app.webhook_url', true) || '/api/webhooks/order-status',
      body    := json_build_object(
        'order_id',     NEW.id,
        'order_number', NEW.order_number,
        'from_status',  OLD.status::text,
        'to_status',    NEW.status::text,
        'customer_id',  NEW.customer_id,
        'total_amount', NEW.total_amount,
        'nickname',     NEW.kakao_nickname,
        'address',      NEW.delivery_address
      )::text,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', current_setting('app.webhook_secret', true)
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_order_status_webhook
AFTER UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION notify_order_status_via_webhook();

-- =============================================
-- pgvector: 고객 구매 패턴 업데이트 트리거
-- =============================================
CREATE OR REPLACE FUNCTION update_customer_preference()
RETURNS TRIGGER AS $$
DECLARE avg_vec vector(512);
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    -- 실제 구현: 상품 임베딩 평균으로 고객 벡터 업데이트
    -- (pgvector 함수 사용, 여기서는 placeholder)
    UPDATE users SET updated_at = now()
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_customer_pref
AFTER UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_customer_preference();
