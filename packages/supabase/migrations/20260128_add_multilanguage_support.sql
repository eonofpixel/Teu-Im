-- Migration: Add multi-language interpretation support
-- Date: 2026-01-28
-- Description: Introduces supported_languages reference table, project_target_languages
--              junction table, and extends interpretations/sessions with language
--              and audio metadata columns.

-- ------------------------------------------------------------
-- 1. Create supported_languages reference table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supported_languages (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  native_name TEXT NOT NULL
);

INSERT INTO supported_languages (code, name, native_name) VALUES
  ('ko', 'Korean', '한국어'),
  ('en', 'English', 'English'),
  ('ja', 'Japanese', '日本語'),
  ('zh', 'Chinese', '中文'),
  ('es', 'Spanish', 'Español'),
  ('fr', 'French', 'Français'),
  ('de', 'German', 'Deutsch'),
  ('pt', 'Portuguese', 'Português'),
  ('ru', 'Russian', 'Русский'),
  ('ar', 'Arabic', 'العربية')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  native_name = EXCLUDED.native_name;

-- ------------------------------------------------------------
-- 2. Create project_target_languages junction table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_target_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL REFERENCES supported_languages(code),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, language_code)
);

-- ------------------------------------------------------------
-- 3. Extend interpretations table
-- ------------------------------------------------------------
ALTER TABLE interpretations
  ADD COLUMN IF NOT EXISTS target_language TEXT REFERENCES supported_languages(code),
  ADD COLUMN IF NOT EXISTS start_time_ms INTEGER,
  ADD COLUMN IF NOT EXISTS end_time_ms INTEGER;

-- ------------------------------------------------------------
-- 4. Extend sessions table with audio storage columns
-- ------------------------------------------------------------
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS audio_file_path TEXT,
  ADD COLUMN IF NOT EXISTS audio_duration_ms INTEGER;

-- ------------------------------------------------------------
-- 5. Row Level Security — supported_languages
-- ------------------------------------------------------------
ALTER TABLE supported_languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read supported languages"
  ON supported_languages
  FOR SELECT
  USING (true);

-- ------------------------------------------------------------
-- 6. Row Level Security — project_target_languages
-- ------------------------------------------------------------
ALTER TABLE project_target_languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their project languages"
  ON project_target_languages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM projects
      WHERE projects.id = project_target_languages.project_id
        AND projects.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 7. Unique constraint for multi-language upsert
-- ------------------------------------------------------------
-- Allow same sequence number with different target languages
-- This enables parallel multi-language interpretation
CREATE UNIQUE INDEX IF NOT EXISTS idx_interpretations_session_seq_lang
  ON interpretations(session_id, sequence, target_language)
  WHERE target_language IS NOT NULL;

-- ------------------------------------------------------------
-- 8. Indexes for common query patterns
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_project_target_languages_project_id
  ON project_target_languages(project_id);

CREATE INDEX IF NOT EXISTS idx_project_target_languages_language_code
  ON project_target_languages(language_code);

CREATE INDEX IF NOT EXISTS idx_interpretations_target_language
  ON interpretations(target_language);

CREATE INDEX IF NOT EXISTS idx_sessions_audio_file_path
  ON sessions(audio_file_path);
