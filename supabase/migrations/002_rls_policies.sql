-- =============================================
-- Row Level Security 정책
-- =============================================

ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_buys    ENABLE ROW LEVEL SECURITY;
ALTER TABLE products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_logs ENABLE ROW LEVEL SECURITY;

-- ─── users ─────────────────────────────────
-- 본인 행만 읽기/수정
CREATE POLICY "users: read own" ON users FOR SELECT
  USING (device_uuid = current_setting('app.device_uuid', true));

CREATE POLICY "users: update own" ON users FOR UPDATE
  USING (device_uuid = current_setting('app.device_uuid', true));

CREATE POLICY "users: insert" ON users FOR INSERT WITH CHECK (true);

-- ─── group_buys ─────────────────────────────
-- active/closed 공구는 누구나 조회
CREATE POLICY "group_buys: public read" ON group_buys FOR SELECT
  USING (status IN ('active', 'closed'));

-- owner만 생성/수정
CREATE POLICY "group_buys: owner write" ON group_buys FOR ALL
  USING (
    owner_id = (SELECT id FROM users WHERE device_uuid = current_setting('app.device_uuid', true))
  );

-- ─── products ───────────────────────────────
CREATE POLICY "products: public read" ON products FOR SELECT
  USING (is_available = true);

CREATE POLICY "products: owner write" ON products FOR ALL
  USING (
    group_buy_id IN (
      SELECT id FROM group_buys
      WHERE owner_id = (SELECT id FROM users WHERE device_uuid = current_setting('app.device_uuid', true))
    )
  );

-- ─── orders ─────────────────────────────────
-- 고객: 본인 주문만
CREATE POLICY "orders: customer read own" ON orders FOR SELECT
  USING (
    customer_id = (SELECT id FROM users WHERE device_uuid = current_setting('app.device_uuid', true))
  );

CREATE POLICY "orders: customer insert" ON orders FOR INSERT
  WITH CHECK (
    customer_id = (SELECT id FROM users WHERE device_uuid = current_setting('app.device_uuid', true))
  );

-- owner: 전체 조회/수정 (service_role 통해)
-- driver: assigned 주문만

-- ─── order_items ────────────────────────────
CREATE POLICY "order_items: read via order" ON order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE customer_id = (SELECT id FROM users WHERE device_uuid = current_setting('app.device_uuid', true))
    )
  );

CREATE POLICY "order_items: insert" ON order_items FOR INSERT WITH CHECK (true);

-- ─── deliveries ─────────────────────────────
CREATE POLICY "deliveries: driver read own" ON deliveries FOR SELECT
  USING (
    driver_id = (SELECT id FROM users WHERE device_uuid = current_setting('app.device_uuid', true))
    OR status = 'pending'
  );

-- ─── order_status_logs ──────────────────────
CREATE POLICY "status_logs: read via order" ON order_status_logs FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE customer_id = (SELECT id FROM users WHERE device_uuid = current_setting('app.device_uuid', true))
    )
  );
