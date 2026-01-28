-- Migration: 002_storage_session_audio
-- Description: Storage bucket and RLS policies for session audio recordings
-- Bucket: session-audio (private)
-- Path format: {session_id}/{filename}.webm or .wav

-- =============================================================================
-- Storage Bucket
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('session-audio', 'session-audio', false)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Storage RLS Policies
-- =============================================================================

-- 세션 소유자만 오디오 업로드 가능
CREATE POLICY "Users can upload audio to their sessions"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'session-audio' AND
  EXISTS (
    SELECT 1 FROM sessions s
    JOIN projects p ON s.project_id = p.id
    WHERE s.id::text = (storage.foldername(name))[1]
    AND p.user_id = auth.uid()
  )
);

-- 세션 소유자만 오디오 읽기 가능
CREATE POLICY "Users can read their session audio"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'session-audio' AND
  EXISTS (
    SELECT 1 FROM sessions s
    JOIN projects p ON s.project_id = p.id
    WHERE s.id::text = (storage.foldername(name))[1]
    AND p.user_id = auth.uid()
  )
);

-- 세션 소유자만 오디오 삭제 가능
CREATE POLICY "Users can delete their session audio"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'session-audio' AND
  EXISTS (
    SELECT 1 FROM sessions s
    JOIN projects p ON s.project_id = p.id
    WHERE s.id::text = (storage.foldername(name))[1]
    AND p.user_id = auth.uid()
  )
);
