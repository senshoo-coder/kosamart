-- =============================================
-- 초기 시드 데이터
-- =============================================

-- 사장님 계정
INSERT INTO users (device_uuid, nickname, role, phone) VALUES
  ('owner-device-uuid-0001', '코사마트사장님', 'owner', '010-1234-5678');

-- 배송기사 계정
INSERT INTO users (device_uuid, nickname, role, phone) VALUES
  ('driver-device-uuid-0001', '홍기사', 'driver', '010-9876-5432'),
  ('driver-device-uuid-0002', '김기사', 'driver', '010-5555-1234');

-- 테스트 고객
INSERT INTO users (device_uuid, nickname, role) VALUES
  ('test-customer-uuid-001', '평창댁', 'customer'),
  ('test-customer-uuid-002', '101동어머니', 'customer'),
  ('test-customer-uuid-003', '산책좋아요', 'customer');

-- 이번 주 공구 (UUID 형식 필수)
INSERT INTO group_buys (id, title, description, owner_id, status, order_deadline, delivery_date, kakao_chat_url)
VALUES (
  'a0000000-0000-0000-0000-202603040001',
  '3월 4주차 반찬·신선식품 공구',
  '이번 주도 신선하고 맛있는 반찬을 준비했습니다! 주문 마감 후 익일 배송',
  (SELECT id FROM users WHERE device_uuid = 'owner-device-uuid-0001'),
  'active',
  now() + interval '2 days',
  CURRENT_DATE + 3,
  'https://open.kakao.com/o/example'
) ON CONFLICT (id) DO NOTHING;

-- 상품 등록
INSERT INTO products (group_buy_id, name, description, price, unit, stock_limit, sort_order) VALUES
  ('a0000000-0000-0000-0000-202603040001', '참나물 무침',   '당일 수확한 신선 참나물',    6500, '팩', 30, 1),
  ('a0000000-0000-0000-0000-202603040001', '궁중 떡볶이',   '매콤달콤 궁중식 떡볶이',     8000, '팩', 20, 2),
  ('a0000000-0000-0000-0000-202603040001', '시금치 나물',   '유기농 시금치 나물',          5000, '팩', 25, 3),
  ('a0000000-0000-0000-0000-202603040001', '볶음밥 세트',   '2인분 볶음밥 세트',           9500, '세트', 15, 4),
  ('a0000000-0000-0000-0000-202603040001', '도라지 무침',   '30% 특가 도라지 무침',        6000, '팩', 20, 5),
  ('a0000000-0000-0000-0000-202603040001', '순두부 찌개',   '따끈한 국물 순두부 찌개',     7500, '팩', 12, 6),
  ('a0000000-0000-0000-0000-202603040001', '[미식연구소] 젓가락돈까스 500g',   '바삭한 수제 돈까스',          12900, '팩', 15, 7),
  ('a0000000-0000-0000-0000-202603040001', '[후쿠오카함바그] 함박 스테이크 400g', '함박150gX2 + 소스50gX2',   12900, '팩', 15, 8),
  ('a0000000-0000-0000-0000-202603040001', '[서문시장] 왕 땅콩빵 300g',         '28개 내외 땅콩 가득 빵',     10900, '봉', 20, 9),
  ('a0000000-0000-0000-0000-202603040001', '[푸드령] 두바이 쫀득 쿠키 65g',     '쫄깃쫄깃 두바이 스타일 쿠키', 5900, '봉', 30, 10);

-- 샘플 주문 데이터
DO $$
DECLARE
  customer1 UUID := (SELECT id FROM users WHERE device_uuid = 'test-customer-uuid-001');
  customer2 UUID := (SELECT id FROM users WHERE device_uuid = 'test-customer-uuid-002');
  gb_id UUID := 'a0000000-0000-0000-0000-202603040001';
  p1 UUID := (SELECT id FROM products WHERE name = '참나물 무침');
  p2 UUID := (SELECT id FROM products WHERE name = '궁중 떡볶이');
  p3 UUID := (SELECT id FROM products WHERE name = '볶음밥 세트');
  order1 UUID;
  order2 UUID;
BEGIN
  -- 주문 1 (승인 완료)
  INSERT INTO orders (id, group_buy_id, customer_id, status, total_amount, delivery_address, kakao_nickname)
  VALUES (gen_random_uuid(), gb_id, customer1, 'approved', 17500, '평창동 **아파트 101동 302호', '평창댁')
  RETURNING id INTO order1;

  INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, subtotal) VALUES
    (order1, p1, '참나물 무침', 6500, 1, 6500),
    (order1, p3, '볶음밥 세트', 9500, 1, 9500);

  -- 주문 2 (입금 대기)
  INSERT INTO orders (id, group_buy_id, customer_id, status, total_amount, delivery_address, kakao_nickname)
  VALUES (gen_random_uuid(), gb_id, customer2, 'pending', 8000, '평창동 **아파트 202동 501호', '101동어머니')
  RETURNING id INTO order2;

  INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, subtotal) VALUES
    (order2, p2, '궁중 떡볶이', 8000, 1, 8000);

  -- 배달 생성 (승인된 주문)
  INSERT INTO deliveries (order_id, status) VALUES (order1, 'pending');
END $$;
