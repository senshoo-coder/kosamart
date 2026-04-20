-- order_items에 상품별 메모 컬럼 추가
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS item_memo TEXT;
