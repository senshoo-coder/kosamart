-- =============================================
-- 016: telegram_notifications RLS 활성화
-- Supabase Security Advisor(rls_disabled_in_public) 대응.
--
-- telegram_notifications 는 anon key(NEXT_PUBLIC_)로 누구나 읽기/수정/삭제가
-- 가능한 상태였음. 앱 코드는 이 테이블을 전혀 참조하지 않으며
-- (텔레그램 알림은 Bot API로 직송, 테이블 미사용),
-- 서버 접근도 service_role 키를 사용 → service_role은 RLS를 우회하므로
-- RLS를 켜고 정책을 두지 않아도 기능 영향은 없다.
--   · 정책 없음 = anon/authenticated 전면 차단
--   · service_role(BYPASSRLS) = 계속 접근 가능
--
-- 주의: 001에서 함께 만든 store_settings/store_images 테이블은 운영 DB에
-- 실제로 존재하지 않음(레포 마이그레이션 ↔ 실제 스키마 드리프트).
-- 2026-07-12 pg_class 조회로 확인 시 RLS 미적용 public 테이블은
-- telegram_notifications 하나뿐이었다.
-- =============================================

ALTER TABLE telegram_notifications ENABLE ROW LEVEL SECURITY;
