-- Migration: 006_analytics
-- Description: Analytics daily aggregation table and helper function for project usage stats
-- Tables: analytics_daily
-- Functions: aggregate_daily_analytics

-- =============================================================================
-- Tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  total_duration_ms BIGINT NOT NULL DEFAULT 0,
  total_interpretations INTEGER NOT NULL DEFAULT 0,
  word_count_original INTEGER NOT NULL DEFAULT 0,
  word_count_translated INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- 프로젝트별 날짜 유일 제약
  UNIQUE (project_id, date)
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_analytics_daily_project_date
  ON analytics_daily(project_id, date);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_date
  ON analytics_daily(date);

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;

-- 프로젝트 소유자만 분석 데이터 조회 가능
CREATE POLICY "Users can read analytics for own projects" ON analytics_daily
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = analytics_daily.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- 프로젝트 소유자만 분석 데이터 생성/수정 가능
CREATE POLICY "Users can manage analytics for own projects" ON analytics_daily
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = analytics_daily.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- =============================================================================
-- Functions: Aggregate daily analytics for a project
-- =============================================================================

CREATE OR REPLACE FUNCTION aggregate_daily_analytics(p_project_id UUID, p_date DATE)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_session_count INTEGER;
  v_duration_ms BIGINT;
  v_interp_count INTEGER;
  v_word_count_orig INTEGER;
  v_word_count_trans INTEGER;
BEGIN
  -- 세션 수 및 총 재생 시간 계산
  SELECT
    COUNT(*)::INTEGER,
    COALESCE(SUM(
      CASE
        WHEN s.ended_at IS NOT NULL THEN
          EXTRACT(EPOCH FROM (s.ended_at - s.started_at)) * 1000
        WHEN s.audio_duration_ms IS NOT NULL THEN
          s.audio_duration_ms
        ELSE 0
      END
    ), 0)::BIGINT
  INTO v_session_count, v_duration_ms
  FROM sessions s
  WHERE s.project_id = p_project_id
    AND s.started_at::DATE = p_date;

  -- 해석 수 및 단어 수 계산 (최종 해석만)
  SELECT
    COUNT(*)::INTEGER,
    COALESCE(SUM(array_length(string_to_array(TRIM(i.original_text), ' '), 1)), 0)::INTEGER,
    COALESCE(SUM(array_length(string_to_array(TRIM(i.translated_text), ' '), 1)), 0)::INTEGER
  INTO v_interp_count, v_word_count_orig, v_word_count_trans
  FROM interpretations i
  JOIN sessions s ON s.id = i.session_id
  WHERE s.project_id = p_project_id
    AND i.is_final = true
    AND i.created_at::DATE = p_date;

  -- Upsert 집계 결과
  INSERT INTO analytics_daily (
    project_id, date, total_sessions, total_duration_ms,
    total_interpretations, word_count_original, word_count_translated
  )
  VALUES (
    p_project_id, p_date, v_session_count, v_duration_ms,
    v_interp_count, v_word_count_orig, v_word_count_trans
  )
  ON CONFLICT (project_id, date) DO UPDATE SET
    total_sessions = EXCLUDED.total_sessions,
    total_duration_ms = EXCLUDED.total_duration_ms,
    total_interpretations = EXCLUDED.total_interpretations,
    word_count_original = EXCLUDED.word_count_original,
    word_count_translated = EXCLUDED.word_count_translated,
    updated_at = now();
END;
$$;

-- =============================================================================
-- Trigger: updated_at 갱신
-- =============================================================================

CREATE OR REPLACE TRIGGER update_analytics_daily_updated_at
  BEFORE UPDATE ON analytics_daily
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
