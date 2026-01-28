-- Migration: 004_audio_chunks
-- Description: Audio chunks table for chunked session audio upload and playback
-- Enables streaming-friendly upload of audio in fixed-size time segments
-- Storage path format: {session_id}/chunks/{chunk_index}.webm

-- =============================================================================
-- Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS audio_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  start_time_ms INTEGER NOT NULL,
  end_time_ms INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL GENERATED ALWAYS AS (end_time_ms - start_time_ms) STORED,
  file_size_bytes INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- 동일 세션 내 청크 인덱스 중복 방지
  CONSTRAINT uq_audio_chunks_session_index UNIQUE (session_id, chunk_index)
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- 세션별 청크 순서 조회 (playback 시 필수)
CREATE INDEX IF NOT EXISTS idx_audio_chunks_session_index
  ON audio_chunks(session_id, chunk_index);

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

ALTER TABLE audio_chunks ENABLE ROW LEVEL SECURITY;

-- 읽기: 프로젝트 소유자만 (세션 소유권을 통해)
CREATE POLICY "Project owners can read audio chunks" ON audio_chunks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN projects p ON s.project_id = p.id
      WHERE s.id = audio_chunks.session_id
      AND p.user_id = auth.uid()
    )
  );

-- 쓰기: 프로젝트 소유자만
CREATE POLICY "Project owners can insert audio chunks" ON audio_chunks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN projects p ON s.project_id = p.id
      WHERE s.id = audio_chunks.session_id
      AND p.user_id = auth.uid()
    )
  );

-- 삭제: 프로젝트 소유자만
CREATE POLICY "Project owners can delete audio chunks" ON audio_chunks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN projects p ON s.project_id = p.id
      WHERE s.id = audio_chunks.session_id
      AND p.user_id = auth.uid()
    )
  );
