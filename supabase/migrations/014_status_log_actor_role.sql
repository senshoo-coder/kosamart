-- 014_status_log_actor_role.sql
-- order_status_logs에 actor_role 컬럼 추가 (감사 추적용)
-- changed_by(UUID)와 note는 이미 존재하지만 미사용 상태였음.
-- actor_role은 users.role을 denormalize해서 보존 — 사용자가 role 변경되거나
-- 삭제돼도 로그에서 당시 역할 확인 가능.

ALTER TABLE order_status_logs
  ADD COLUMN IF NOT EXISTS actor_role TEXT;

-- 어떤 인덱스도 필요하지 않음 (조회는 항상 order_id 기준 + 시간 정렬)
