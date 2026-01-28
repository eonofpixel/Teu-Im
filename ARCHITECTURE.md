# Teu-Im: 실시간 통역 시스템 아키텍처

> Soniox API 기반 실시간 통역 및 송출 서비스

---

## 1. 기존 설계(guide.md) 문제점 분석

### 1.1 치명적 문제

| 영역 | 문제점 | 영향 |
|------|--------|------|
| **아키텍처** | 모든 음성이 백엔드 서버 경유 | +150ms 레이턴시, 서버 대역폭 비용 폭증 |
| **실시간성** | App → Server → Soniox → Server → Client | 총 230ms+ 지연 |
| **확장성** | 단일 Express + Socket.io 서버 | 동시접속 한계, 단일 장애점 |
| **복잡도** | PostgreSQL + Redis + SQLite (3개 DB) | 운영 부담, 개발 속도 저하 |
| **배포** | Tauri + Rust + PM2 + Nginx | 과도한 인프라 복잡도 |

### 1.2 설계 결함

1. **A안/B안 혼재**: 2차 모니터 vs QR코드 - 명확한 방향 부재
2. **Outbox 패턴**: 오프라인 처리에 과잉 설계
3. **SQLCipher**: 로컬 DB 암호화 불필요 (Soniox가 음성 처리)
4. **서버 중심**: 클라이언트가 할 수 있는 일을 서버가 대신

---

## 2. 새로운 아키텍처

### 2.1 핵심 원칙

```
1. 음성 스트림은 클라이언트가 Soniox에 직접 연결 (서버 경유 X)
2. 서버는 인증/조정/저장만 담당 (경량화)
3. 텍스트 브로드캐스트만 실시간 동기화
4. 모바일은 PWA로 앱 설치 불필요
```

### 2.2 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            클라이언트 계층                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────┐         ┌────────────────────┐                      │
│  │   Tauri Desktop    │         │   Mobile PWA       │                      │
│  │   (Windows/Mac)    │         │   (QR 접속)        │                      │
│  │                    │         │                    │                      │
│  │  ┌──────────────┐  │         │  ┌──────────────┐  │                      │
│  │  │ Soniox SDK   │──┼─────────┼──│ 실시간 뷰어  │  │                      │
│  │  │ 직접 연결    │  │         │  │ (텍스트 수신)│  │                      │
│  │  └──────┬───────┘  │         │  └──────┬───────┘  │                      │
│  └─────────┼──────────┘         └─────────┼──────────┘                      │
│            │                              │                                  │
│            │ ① 음성 스트림                │ ④ 실시간 텍스트                  │
│            │ (WebSocket 직접연결)         │ (Supabase Realtime)              │
│            ▼                              │                                  │
│  ┌─────────────────────┐                  │                                  │
│  │   Soniox API        │                  │                                  │
│  │   wss://stt-rt...   │                  │                                  │
│  │   ② STT + 번역      │                  │                                  │
│  └─────────┬───────────┘                  │                                  │
│            │ ③ 텍스트 결과                │                                  │
│            ▼                              ▼                                  │
└────────────┼──────────────────────────────┼──────────────────────────────────┘
             │                              │
             ▼                              │
┌────────────────────────────────────────────────────────────────────────────┐
│                           백엔드 계층 (Serverless)                          │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Next.js API Routes (Vercel)                       │   │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐            │   │
│  │  │  Auth API     │  │  Project API  │  │  Temp Key API │            │   │
│  │  │  (Supabase)   │  │  (CRUD)       │  │  (Soniox)     │            │   │
│  │  └───────────────┘  └───────────────┘  └───────────────┘            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            데이터 계층 (Supabase)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐       │
│  │  PostgreSQL       │  │  Supabase Auth    │  │  Supabase         │       │
│  │  - users          │  │  - JWT 인증       │  │  Realtime         │       │
│  │  - projects       │  │  - RLS 정책       │  │  - 텍스트 브로드   │       │
│  │  - sessions       │  │                   │  │    캐스트          │       │
│  │  - interpretations│  │                   │  │                   │       │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘       │
│                                                                              │
│  ┌───────────────────┐                                                      │
│  │  Supabase Storage │                                                      │
│  │  - 음성 파일 저장  │                                                      │
│  └───────────────────┘                                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 데이터 흐름

```
1. 관리자 → 웹에서 프로젝트 생성 → Supabase에 저장
2. 데스크톱 앱 → 로그인 후 프로젝트 선택
3. 앱이 서버에서 Temporary Soniox API Key 발급 받음
4. 앱 → Soniox API 직접 WebSocket 연결 (음성 스트림)
5. Soniox → 실시간 STT + 번역 결과 반환
6. 앱 → 결과를 Supabase에 저장 + Realtime 브로드캐스트
7. 모바일 PWA → Supabase Realtime 구독으로 즉시 수신
```

### 2.4 레이턴시 비교

| 구간 | 기존 설계 | 새 설계 | 개선 |
|------|----------|---------|------|
| 음성 → STT | App → Server → Soniox (150ms) | App → Soniox (50ms) | -100ms |
| STT → 번역 | 30ms | 30ms | - |
| 결과 → 모바일 | Server → Mobile (50ms) | Realtime (30ms) | -20ms |
| **총합** | **~230ms** | **~110ms** | **-52%** |

---

## 3. 기술 스택

### 3.1 프론트엔드

| 구성요소 | 기술 | 버전 | 선택 이유 |
|----------|------|------|-----------|
| **관리 웹** | Next.js | 15+ | App Router, Server Actions |
| **데스크톱 앱** | Tauri | 2.0+ | 경량(8MB), Rust 백엔드, 네이티브 |
| **모바일** | PWA | - | 앱 설치 불필요, QR 즉시 접속 |
| **UI 프레임워크** | React | 19+ | 생태계, 호환성 |
| **스타일링** | Tailwind CSS | 4+ | 유틸리티 CSS |
| **상태관리** | Zustand | 5+ | 경량, 단순 |

### 3.2 백엔드

| 구성요소 | 기술 | 선택 이유 |
|----------|------|-----------|
| **API** | Next.js API Routes | 프론트엔드 통합, Vercel 배포 |
| **인증** | Supabase Auth | JWT, RLS, 소셜 로그인 |
| **데이터베이스** | Supabase (PostgreSQL) | 관계형, Realtime 내장 |
| **실시간 동기화** | Supabase Realtime | WAL 기반, 필터 구독 |
| **파일 저장** | Supabase Storage | S3 호환, CDN |

### 3.3 외부 서비스

| 서비스 | 용도 | 비용 |
|--------|------|------|
| **Soniox API** | 실시간 STT + 번역 | ~$0.12/시간 |
| **Supabase** | DB + Auth + Realtime + Storage | $25/월 (Pro) |
| **Vercel** | 웹 호스팅 + API | $20/월 (Pro) |

### 3.4 비용 비교

| 항목 | 기존 설계 | 새 설계 |
|------|----------|---------|
| 서버 (VPS) | $50-100/월 | $0 (Serverless) |
| DB (PostgreSQL + Redis) | $30/월 | $25/월 (Supabase) |
| 호스팅 | $20/월 | $20/월 (Vercel) |
| **총합** | **$100-150/월** | **$45/월** |

---

## 4. 데이터베이스 스키마

### 4.1 ERD

```
┌─────────────────┐
│     users       │
│─────────────────│
│ id (PK, UUID)   │
│ email           │
│ name            │
│ soniox_api_key  │ ← 암호화 저장
│ created_at      │
└────────┬────────┘
         │ 1:N
         ▼
┌─────────────────┐
│    projects     │
│─────────────────│
│ id (PK, UUID)   │
│ user_id (FK)    │
│ name            │
│ code (unique)   │ ← 6자리 참여 코드
│ password        │ ← 참석자 접속용
│ source_lang     │
│ target_lang     │
│ status          │
│ created_at      │
└────────┬────────┘
         │ 1:N
         ▼
┌─────────────────┐
│    sessions     │
│─────────────────│
│ id (PK, UUID)   │
│ project_id (FK) │
│ status          │
│ started_at      │
│ ended_at        │
└────────┬────────┘
         │ 1:N
         ▼
┌─────────────────────┐
│  interpretations    │
│─────────────────────│
│ id (PK, UUID)       │
│ session_id (FK)     │
│ original_text       │
│ translated_text     │
│ is_final            │
│ sequence            │
│ created_at          │
└─────────────────────┘
```

### 4.2 테이블 정의

```sql
-- 사용자
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  soniox_api_key TEXT, -- 암호화
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 프로젝트
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL, -- 6자리 참여 코드
  password TEXT NOT NULL,    -- 참석자 접속용
  source_lang TEXT NOT NULL DEFAULT 'ko',
  target_lang TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'idle', -- idle, active, ended
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 세션
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active', -- active, paused, ended
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- 통역 내역
CREATE TABLE interpretations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  original_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  is_final BOOLEAN DEFAULT false,
  sequence INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 정책
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interpretations ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 데이터만 접근
CREATE POLICY "Users can view own data" ON users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage own projects" ON projects
  FOR ALL USING (auth.uid() = user_id);

-- 참석자는 통역 내역 읽기만 가능 (별도 인증)
CREATE POLICY "Participants can view interpretations" ON interpretations
  FOR SELECT USING (true); -- session_id 기반 필터링은 앱에서
```

---

## 5. API 설계

### 5.1 인증 API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/auth/signup` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/auth/me` | 현재 사용자 |

### 5.2 프로젝트 API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/projects` | 프로젝트 목록 |
| POST | `/api/projects` | 프로젝트 생성 |
| GET | `/api/projects/:id` | 프로젝트 상세 |
| PATCH | `/api/projects/:id` | 프로젝트 수정 |
| DELETE | `/api/projects/:id` | 프로젝트 삭제 |

### 5.3 세션 API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/projects/:id/sessions` | 세션 시작 |
| PATCH | `/api/sessions/:id` | 세션 상태 변경 |
| GET | `/api/sessions/:id/interpretations` | 통역 내역 |

### 5.4 Soniox API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/soniox/temp-key` | 임시 API 키 발급 |
| POST | `/api/settings/soniox-key` | API 키 저장 |
| GET | `/api/settings/soniox-key` | API 키 상태 확인 |

### 5.5 참석자 API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/join` | 프로젝트 참여 (코드 + 비밀번호) |
| GET | `/api/join/:code/status` | 프로젝트 상태 확인 |

---

## 6. 프로젝트 구조

```
teu-im/
├── apps/
│   ├── web/                    # Next.js 관리 웹
│   │   ├── app/
│   │   │   ├── (auth)/         # 로그인/회원가입
│   │   │   ├── (dashboard)/    # 대시보드
│   │   │   ├── api/            # API Routes
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   └── lib/
│   │
│   ├── desktop/                # Tauri 데스크톱 앱
│   │   ├── src/                # React 프론트엔드
│   │   ├── src-tauri/          # Rust 백엔드
│   │   └── tauri.conf.json
│   │
│   └── mobile/                 # PWA 참석자 앱
│       ├── app/
│       └── components/
│
├── packages/
│   ├── shared/                 # 공유 유틸리티
│   │   ├── types/              # TypeScript 타입
│   │   └── utils/
│   │
│   ├── ui/                     # 공유 UI 컴포넌트
│   │   └── components/
│   │
│   └── supabase/              # Supabase 클라이언트
│       ├── client.ts
│       └── types.ts
│
├── supabase/
│   ├── migrations/            # DB 마이그레이션
│   └── seed.sql              # 시드 데이터
│
├── package.json              # pnpm workspace
├── pnpm-workspace.yaml
├── turbo.json               # Turborepo 설정
└── README.md
```

---

## 7. 개발 로드맵

### Phase 1: 기반 구축 (1주)
- [ ] Monorepo 구조 설정 (pnpm + Turborepo)
- [ ] Supabase 프로젝트 생성 및 스키마 적용
- [ ] 공유 패키지 설정 (types, ui, supabase)

### Phase 2: 관리 웹 (2주)
- [ ] Next.js 앱 기본 구조
- [ ] Supabase Auth 연동
- [ ] 프로젝트 CRUD
- [ ] 설정 페이지 (API 키 관리)

### Phase 3: 데스크톱 앱 (2주)
- [ ] Tauri 2.0 기본 구조
- [ ] Soniox SDK 연동
- [ ] 실시간 통역 화면
- [ ] 2차 모니터 출력

### Phase 4: 모바일 PWA (1주)
- [ ] 참석자 접속 화면
- [ ] 실시간 통역 뷰어
- [ ] Supabase Realtime 구독

### Phase 5: 안정화 (1주)
- [ ] 에러 핸들링
- [ ] 오프라인/재연결 처리
- [ ] 성능 최적화
- [ ] 배포 자동화

---

## 8. 주요 리스크 및 완화

| 리스크 | 영향 | 완화 전략 |
|--------|------|----------|
| Soniox API 변경 | 직접 연결 불가 | 추상화 레이어, 대체 API 검토 |
| Tauri WebView 호환성 | 플랫폼별 렌더링 차이 | 초기 PoC에서 검증 |
| Supabase Realtime 한계 | 대규모 브로드캐스트 | 채널 분리, 필터 최적화 |
| 네트워크 불안정 | 통역 끊김 | 로컬 버퍼링, 자동 재연결 |

---

## 9. 참고 자료

- [Soniox API 문서](https://soniox.com/docs)
- [Soniox Web SDK](https://soniox.com/docs/stt/SDKs/web-sdk)
- [Tauri 2.0 문서](https://v2.tauri.app/)
- [Supabase 문서](https://supabase.com/docs)
- [Next.js 15 문서](https://nextjs.org/docs)
