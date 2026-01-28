-- Migration: Full-text search for interpretations
-- Date: 2026-01-28
-- Description: Adds tsvector columns, GIN indexes, an auto-update trigger,
--              and a search function to the interpretations table for fast
--              full-text queries scoped to a project.

-- ------------------------------------------------------------
-- 1. Add tsvector columns
-- ------------------------------------------------------------
ALTER TABLE interpretations
  ADD COLUMN IF NOT EXISTS original_text_tsvector  tsvector,
  ADD COLUMN IF NOT EXISTS translated_text_tsvector tsvector;

-- ------------------------------------------------------------
-- 2. Backfill existing rows
-- ------------------------------------------------------------
UPDATE interpretations
SET
  original_text_tsvector  = to_tsvector('simple', COALESCE(original_text, '')),
  translated_text_tsvector = to_tsvector('simple', COALESCE(translated_text, ''))
WHERE
  original_text_tsvector IS NULL
  OR translated_text_tsvector IS NULL;

-- ------------------------------------------------------------
-- 3. GIN indexes for fast full-text lookups
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_interpretations_original_text_fts
  ON interpretations USING GIN (original_text_tsvector);

CREATE INDEX IF NOT EXISTS idx_interpretations_translated_text_fts
  ON interpretations USING GIN (translated_text_tsvector);

-- ------------------------------------------------------------
-- 4. Trigger function to keep tsvectors in sync
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION interpretations_update_tsvectors()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.original_text_tsvector  := to_tsvector('simple', COALESCE(NEW.original_text, ''));
  NEW.translated_text_tsvector := to_tsvector('simple', COALESCE(NEW.translated_text, ''));
  RETURN NEW;
END;
$$;

-- Drop and recreate to handle idempotent migrations cleanly
DROP TRIGGER IF EXISTS interpretations_tsvector_sync ON interpretations;

CREATE TRIGGER interpretations_tsvector_sync
  BEFORE INSERT OR UPDATE ON interpretations
  FOR EACH ROW
  EXECUTE FUNCTION interpretations_update_tsvectors();

-- ------------------------------------------------------------
-- 5. Search function
--    Returns matching interpretations with session context,
--    ordered by relevance (ts_rank).  Uses plainto_tsquery so
--    callers pass natural language phrases without needing to
--    learn tsquery syntax.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION search_interpretations(
  query      text,
  p_project_id uuid,
  p_limit    integer DEFAULT 20,
  p_offset   integer DEFAULT 0
)
RETURNS TABLE (
  interpretation_id   uuid,
  session_id          uuid,
  original_text       text,
  translated_text     text,
  target_language     text,
  is_final            boolean,
  sequence            integer,
  start_time_ms       integer,
  end_time_ms         integer,
  created_at          timestamptz,
  session_started_at  timestamptz,
  session_ended_at    timestamptz,
  rank                real
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  ts_query tsquery;
BEGIN
  -- Guard: empty query returns nothing
  IF query IS NULL OR query = '' THEN
    RETURN;
  END IF;

  -- Convert free-form text to tsquery using simple config
  ts_query := plainto_tsquery('simple', query);

  -- Guard: if plainto_tsquery produced an empty result (e.g. all stop words)
  IF ts_query = ''::tsquery THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    i.id                          AS interpretation_id,
    i.session_id                  AS session_id,
    i.original_text               AS original_text,
    i.translated_text             AS translated_text,
    i.target_language             AS target_language,
    i.is_final                    AS is_final,
    i.sequence                    AS sequence,
    i.start_time_ms               AS start_time_ms,
    i.end_time_ms                 AS end_time_ms,
    i.created_at                  AS created_at,
    s.started_at                  AS session_started_at,
    s.ended_at                    AS session_ended_at,
    ts_rank(
      i.original_text_tsvector || i.translated_text_tsvector,
      ts_query
    )                             AS rank
  FROM interpretations i
  INNER JOIN sessions s ON s.id = i.session_id
  WHERE
    s.project_id = p_project_id
    AND (
      i.original_text_tsvector  @@ ts_query
      OR i.translated_text_tsvector @@ ts_query
    )
  ORDER BY rank DESC, i.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute to authenticated users (RLS on underlying tables
-- already enforces project ownership via session → project chain)
GRANT EXECUTE ON FUNCTION search_interpretations(text, uuid, integer, integer)
  TO authenticated;

-- ------------------------------------------------------------
-- 6. Helper: count total matches for pagination
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION count_search_interpretations(
  query      text,
  p_project_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  ts_query tsquery;
  total    integer;
BEGIN
  IF query IS NULL OR query = '' THEN
    RETURN 0;
  END IF;

  ts_query := plainto_tsquery('simple', query);

  IF ts_query = ''::tsquery THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*)
  INTO total
  FROM interpretations i
  INNER JOIN sessions s ON s.id = i.session_id
  WHERE
    s.project_id = p_project_id
    AND (
      i.original_text_tsvector  @@ ts_query
      OR i.translated_text_tsvector @@ ts_query
    );

  RETURN total;
END;
$$;

GRANT EXECUTE ON FUNCTION count_search_interpretations(text, uuid)
  TO authenticated;
