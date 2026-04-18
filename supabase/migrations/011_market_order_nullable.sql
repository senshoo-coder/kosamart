-- =============================================
-- 011: 상점가 주문 지원 — NOT NULL 제약 완화
-- 상점가 주문(market order)은 group_buy_id, product_id 없이 생성됨
-- =============================================

-- orders.group_buy_id: 공구 주문에만 사용, 상점가 주문은 NULL
ALTER TABLE orders ALTER COLUMN group_buy_id DROP NOT NULL;

-- order_items.product_id: 상점가 상품은 products 테이블에 없으므로 NULL 허용
ALTER TABLE order_items ALTER COLUMN product_id DROP NOT NULL;
