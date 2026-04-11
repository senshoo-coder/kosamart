-- =============================================
-- 코사마트 OMS/DMS 초기 스키마
-- =============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =============================================
-- ENUM 타입
-- =============================================
CREATE TYPE user_role AS ENUM ('customer', 'owner', 'driver');
CREATE TYPE group_buy_status AS ENUM ('draft', 'active', 'closed', 'cancelled');
CREATE TYPE order_status AS ENUM (
  'pending', 'paid', 'approved', 'rejected', 'preparing',
  'ready', 'delivering', 'delivered', 'cancelled'
);
CREATE TYPE delivery_status AS ENUM (
  'pending', 'assigned', 'picked_up', 'delivering', 'delivered', 'failed'
);

-- =============================================
-- users
-- =============================================
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_uuid     TEXT UNIQUE NOT NULL,
  nickname        TEXT NOT NULL,
  role            user_role NOT NULL DEFAULT 'customer',
  phone           TEXT,
  telegram_chat_id BIGINT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  pref_vector     vector(512),          -- pgvector: 구매 패턴
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_device_uuid ON users(device_uuid);
CREATE INDEX idx_users_role ON users(role);

-- =============================================
-- group_buys (공구 이벤트)
-- =============================================
CREATE TABLE group_buys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  kakao_chat_url  TEXT,
  owner_id        UUID REFERENCES users(id),
  status          group_buy_status NOT NULL DEFAULT 'draft',
  order_deadline  TIMESTAMPTZ,
  delivery_date   DATE,
  min_order_amount INTEGER NOT NULL DEFAULT 0,
  banner_image_url TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_group_buys_status ON group_buys(status);
CREATE INDEX idx_group_buys_deadline ON group_buys(order_deadline);

-- =============================================
-- products
-- =============================================
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_buy_id    UUID NOT NULL REFERENCES group_buys(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  price           INTEGER NOT NULL,
  unit            TEXT NOT NULL DEFAULT '개',
  stock_limit     INTEGER,
  image_url       TEXT,
  is_available    BOOLEAN NOT NULL DEFAULT true,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  name_vector     vector(1536),         -- pgvector: 상품 임베딩
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_group_buy ON products(group_buy_id);
CREATE INDEX idx_products_vector ON products USING hnsw (name_vector vector_cosine_ops);

-- =============================================
-- orders
-- =============================================
CREATE SEQUENCE order_seq START 100;

CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number    TEXT UNIQUE NOT NULL DEFAULT 'GB' || to_char(now(), 'YYMMDD') || '-' || LPAD(nextval('order_seq')::TEXT, 3, '0'),
  group_buy_id    UUID NOT NULL REFERENCES group_buys(id),
  customer_id     UUID NOT NULL REFERENCES users(id),
  status          order_status NOT NULL DEFAULT 'pending',
  total_amount    INTEGER NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_memo   TEXT,
  kakao_nickname  TEXT NOT NULL,
  owner_memo      TEXT,
  rejected_reason TEXT,
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_customer ON orders(customer_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders(status, created_at DESC);
CREATE INDEX idx_orders_group_buy ON orders(group_buy_id);

-- =============================================
-- order_items
-- =============================================
CREATE TABLE order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  product_name    TEXT NOT NULL,
  unit_price      INTEGER NOT NULL,
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  subtotal        INTEGER NOT NULL
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- =============================================
-- deliveries
-- =============================================
CREATE TABLE deliveries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID UNIQUE NOT NULL REFERENCES orders(id),
  driver_id           UUID REFERENCES users(id),
  status              delivery_status NOT NULL DEFAULT 'pending',
  assigned_at         TIMESTAMPTZ,
  picked_up_at        TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  delivery_photo_url  TEXT,
  driver_memo         TEXT,
  failed_reason       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deliveries_driver ON deliveries(driver_id, status);
CREATE INDEX idx_deliveries_status ON deliveries(status);

-- =============================================
-- order_status_logs
-- =============================================
CREATE TABLE order_status_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status     order_status,
  to_status       order_status NOT NULL,
  changed_by      UUID REFERENCES users(id),
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_status_logs_order ON order_status_logs(order_id, created_at);

-- =============================================
-- telegram_notifications
-- =============================================
CREATE TABLE telegram_notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID REFERENCES orders(id),
  chat_id         BIGINT NOT NULL,
  message         TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  sent_at         TIMESTAMPTZ,
  error_msg       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- updated_at 자동 갱신 트리거
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at        BEFORE UPDATE ON users        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_group_buys_updated_at   BEFORE UPDATE ON group_buys   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated_at       BEFORE UPDATE ON orders       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_deliveries_updated_at   BEFORE UPDATE ON deliveries   FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 주문 상태 변경 로그 트리거
-- =============================================
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_logs (order_id, from_status, to_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_status_log
AFTER UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION log_order_status_change();
