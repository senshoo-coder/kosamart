-- =============================================
-- 008: store_settings 테이블 생성 + is_active 컬럼
-- 관리자가 가게 노출 여부를 제어하기 위한 설정
-- =============================================

CREATE TABLE IF NOT EXISTS store_settings (
  store_id      TEXT PRIMARY KEY,
  name          TEXT,
  is_open       BOOLEAN NOT NULL DEFAULT true,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  min_order     INTEGER,
  delivery_fee  INTEGER,
  badge         TEXT,
  hours         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_store_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_store_settings_updated_at ON store_settings;
CREATE TRIGGER trg_store_settings_updated_at
  BEFORE UPDATE ON store_settings
  FOR EACH ROW EXECUTE FUNCTION update_store_settings_updated_at();

-- RLS 비활성화 (service_role key로만 접근)
ALTER TABLE store_settings DISABLE ROW LEVEL SECURITY;
