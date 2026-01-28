-- =============================================================================
-- Seed Data for Teu-Im
-- =============================================================================
-- 주의: 이 파일은 로컬 개발 환경에서만 사용됩니다.
-- 실행 방법: supabase db reset (마이그레이션 후 자동 실행)
-- auth.users 테이블에 먼저 행이 있어야 users 테이블 INSERT가 가능합니다.
-- 로컬 개발 시 Supabase CLI가 service_role로 실행되므로 RLS를 우회합니다.
-- =============================================================================

-- Seed 용 UUID 상수 (고정된 테스트 사용자)
-- Test User 1: 관리자 역할의 테스트 사용자
DO $$
BEGIN
  -- Test User 1이 auth.users에 없으면 생성
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001') THEN
    INSERT INTO auth.users (id, email, created_at, updated_at, email_confirmed_at, role)
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      'admin@teu-im.local',
      now(),
      now(),
      now(),
      'authenticated'
    );
  END IF;

  -- Test User 2: 참석자 테스트용 사용자
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000002') THEN
    INSERT INTO auth.users (id, email, created_at, updated_at, email_confirmed_at, role)
    VALUES (
      '00000000-0000-0000-0000-000000000002',
      'user@teu-im.local',
      now(),
      now(),
      now(),
      'authenticated'
    );
  END IF;
END $$;

-- =============================================================================
-- Users
-- =============================================================================

INSERT INTO users (id, email, name, soniox_api_key, created_at, updated_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'admin@teu-im.local',
    'Admin User',
    'test_soniox_api_key_placeholder', -- 실제 키는 암호화 후 저장
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'user@teu-im.local',
    'Test User',
    NULL,
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Projects
-- =============================================================================

INSERT INTO projects (id, user_id, name, code, password, source_lang, target_lang, status, created_at, updated_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'Test Conference 2026',
    'TC2026',            -- 6자리 참여 코드
    'demo1234',          -- 테스트용 단순 비밀번호
    'ko',
    'en',
    'idle',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000001',
    'Product Presentation',
    'PP0128',
    'secure56',
    'ko',
    'ja',
    'active',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000002',
    'Team Meeting',
    'TM2501',
    'meeting99',
    'en',
    'ko',
    'ended',
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Sessions
-- =============================================================================

INSERT INTO sessions (id, project_id, status, started_at, ended_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000010', -- Test Conference 2026
    'active',
    now() - INTERVAL '30 minutes',
    NULL
  ),
  (
    '00000000-0000-0000-0000-000000000021',
    '00000000-0000-0000-0000-000000000011', -- Product Presentation
    'paused',
    now() - INTERVAL '2 hours',
    NULL
  ),
  (
    '00000000-0000-0000-0000-000000000022',
    '00000000-0000-0000-0000-000000000012', -- Team Meeting
    'ended',
    now() - INTERVAL '1 day',
    now() - INTERVAL '23 hours'
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Interpretations (테스트용 통역 결과)
-- =============================================================================

INSERT INTO interpretations (id, session_id, original_text, translated_text, is_final, sequence, created_at)
VALUES
  -- Session 1: Test Conference (active session)
  (
    '00000000-0000-0000-0000-000000000030',
    '00000000-0000-0000-0000-000000000020',
    '안녕하세요, 여러분. 오늘의 컨퍼런스에 환영합니다.',
    'Hello, everyone. Welcome to today''s conference.',
    true,
    1,
    now() - INTERVAL '25 minutes'
  ),
  (
    '00000000-0000-0000-0000-000000000031',
    '00000000-0000-0000-0000-000000000020',
    '우리의 첫 번째 발표자를 소개하겠습니다.',
    'Let me introduce our first speaker.',
    true,
    2,
    now() - INTERVAL '20 minutes'
  ),
  (
    '00000000-0000-0000-0000-000000000032',
    '00000000-0000-0000-0000-000000000020',
    '실시간 통역 테스트 진행 중입니다.',
    'Real-time interpretation test is in progress.',
    false,  -- is_final = false: 중간 결과 (스트리밍 중)
    3,
    now() - INTERVAL '5 minutes'
  ),

  -- Session 2: Product Presentation (paused session)
  (
    '00000000-0000-0000-0000-000000000033',
    '00000000-0000-0000-0000-000000000021',
    '제품 출시 일정에 대해 설명하겠습니다.',
    '제품 デモの予定についてお伝えします。',
    true,
    1,
    now() - INTERVAL '1 hour 50 minutes'
  ),
  (
    '00000000-0000-0000-0000-000000000034',
    '00000000-0000-0000-0000-000000000021',
    '다음 분기 목표는 사용자 수를 두 배로 늘리는 것입니다.',
    '来期の目標は、ユーザー数を2倍にすることです。',
    true,
    2,
    now() - INTERVAL '1 hour 30 minutes'
  ),

  -- Session 3: Team Meeting (ended session)
  (
    '00000000-0000-0000-0000-000000000035',
    '00000000-0000-0000-0000-000000000022',
    'Good morning, team. Let''s get started with today''s standup.',
    '안녕하세요, 팀원들. 오늘의 스탠더브로 시작하겠습니다.',
    true,
    1,
    now() - INTERVAL '23 hours 55 minutes'
  ),
  (
    '00000000-0000-0000-0000-000000000036',
    '00000000-0000-0000-0000-000000000022',
    'Any blockers from yesterday?',
    '어제 진행 중에 막힌 것이 있나요?',
    true,
    2,
    now() - INTERVAL '23 hours 50 minutes'
  ),
  (
    '00000000-0000-0000-0000-000000000037',
    '00000000-0000-0000-0000-000000000022',
    'Great, let''s wrap up. Same time tomorrow.',
    '좋습니다, 마무리하겠습니다. 내일 같은 시간에 봅시다.',
    true,
    3,
    now() - INTERVAL '23 hours 30 minutes'
  )
ON CONFLICT (id) DO NOTHING;
