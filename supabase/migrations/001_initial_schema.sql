-- Migration: 001_initial_schema
-- Description: Initial database schema for Teu-Im real-time interpretation service
-- Tables: users, projects, sessions, interpretations
-- Includes: RLS policies, indexes, triggers, and Realtime subscription

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- Tables
-- =============================================================================

-- Users table (Supabase Auth와 연동)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  soniox_api_key TEXT, -- 암호화 저장 권장
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL, -- 6자리 참여 코드
  password TEXT NOT NULL,    -- 참석자 접속용
  source_lang TEXT NOT NULL DEFAULT 'ko',
  target_lang TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'active', 'ended')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- Interpretations table
CREATE TABLE IF NOT EXISTS interpretations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  original_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  is_final BOOLEAN DEFAULT false,
  sequence INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(code);
CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_interpretations_session_id ON interpretations(session_id);
CREATE INDEX IF NOT EXISTS idx_interpretations_sequence ON interpretations(session_id, sequence);

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interpretations ENABLE ROW LEVEL SECURITY;

-- --- users policies ---
-- 자신의 프로필만 조회
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- 자신의 프로필만 수정
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 자신의 프로필만 생성
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- --- projects policies ---
-- 소유자만 프로젝트 관리 (CRUD 전체)
CREATE POLICY "Users can manage own projects" ON projects
  FOR ALL USING (auth.uid() = user_id);

-- --- sessions policies ---
-- 프로젝트 소유자만 세션 관리
CREATE POLICY "Users can manage sessions of own projects" ON sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = sessions.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- --- interpretations policies ---
-- 읽기: 모두 가능 (참석자 뷰어용)
CREATE POLICY "Anyone can read interpretations" ON interpretations
  FOR SELECT USING (true);

-- 쓰기: 프로젝트 소유자만 가능
CREATE POLICY "Only project owners can insert interpretations" ON interpretations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      JOIN projects ON projects.id = sessions.project_id
      WHERE sessions.id = interpretations.session_id
      AND projects.user_id = auth.uid()
    )
  );

-- =============================================================================
-- Triggers
-- =============================================================================

-- updated_at 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- users 테이블에 적용
CREATE OR REPLACE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- projects 테이블에 적용
CREATE OR REPLACE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Supabase Realtime
-- =============================================================================

-- interpretations 테이블에 실시간 구독 활성화
-- 참석자 클라이언트가 실시간으로 통역 결과를 수신할 수 있도록 설정
ALTER PUBLICATION supabase_realtime ADD TABLE interpretations;
