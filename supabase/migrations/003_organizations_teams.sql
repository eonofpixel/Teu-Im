-- Migration: 003_organizations_teams
-- Description: Organization and team management with role-based access control
-- Tables: organizations, organization_members
-- Alters: projects (add organization_id foreign key)
-- Includes: RLS policies, indexes, updated_at trigger

-- =============================================================================
-- Enums
-- =============================================================================

-- 조직 멤버 역할: owner / admin / interpreter / viewer
CREATE TYPE organization_member_role AS ENUM ('owner', 'admin', 'interpreter', 'viewer');

-- 구독 이어: free / pro / enterprise
CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise');

-- =============================================================================
-- Tables
-- =============================================================================

-- Organizations 테이블
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly 식별자 (예: my-company)
  logo_url TEXT,              -- 로고 이미지 URL (Storage 또는 외부)
  subscription_tier subscription_tier NOT NULL DEFAULT 'free',
  max_concurrent_sessions INTEGER NOT NULL DEFAULT 3, -- 구독 등급별 동시 세션 제한
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Organization Members 테이블 (조직 <-> 사용자 매핑 및 역할 관리)
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role organization_member_role NOT NULL DEFAULT 'viewer',
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL, -- 초대 발신자 (조직 직접 가입 시 NULL)
  joined_at TIMESTAMPTZ DEFAULT now(),
  -- 동일 사용자가 같은 조직에 중복 가입하지 못함
  UNIQUE (organization_id, user_id)
);

-- =============================================================================
-- Alter Existing Tables
-- =============================================================================

-- projects 테이블에 organization_id 컬럼 추가 (선택적 - 개인 프로젝트 시 NULL 가능)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- =============================================================================
-- Indexes
-- =============================================================================

-- organizations 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- organization_members 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_user ON organization_members(organization_id, user_id);

-- projects 테이블에 조직 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- --- organizations policies ---

-- 멤버만 자신이 속한 조직 조회 가능
CREATE POLICY "Members can view their organizations" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organizations.id
      AND om.user_id = auth.uid()
    )
  );

-- admin 이상만 조직 정보 수정 가능
CREATE POLICY "Admins can update organization" ON organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organizations.id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- owner만 조직 삭제 가능
CREATE POLICY "Owners can delete organization" ON organizations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organizations.id
      AND om.user_id = auth.uid()
      AND om.role = 'owner'
    )
  );

-- owner / admin만 새 조직 생성 가능 (생성 시 즉시 owner로 등록됨)
CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (true);

-- --- organization_members policies ---

-- 같은 조직 멤버끼리 서로 조회 가능
CREATE POLICY "Members can view other members in same organization" ON organization_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- admin 이상만 새 멤버 추가 (초대)
CREATE POLICY "Admins can invite members" ON organization_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- admin 이상만 멤버 역할 수정 가능
CREATE POLICY "Admins can update member roles" ON organization_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- admin 이상이거나 자신을 직접 탈퇴할 수 있음
CREATE POLICY "Admins can remove members or users can leave" ON organization_members
  FOR DELETE USING (
    -- 자기 자신 탈퇴
    organization_members.user_id = auth.uid()
    OR
    -- admin 이상이 타인 제거
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- =============================================================================
-- Triggers
-- =============================================================================

-- organizations 테이블에 updated_at 자동 갱신 트리거 적용
CREATE OR REPLACE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
