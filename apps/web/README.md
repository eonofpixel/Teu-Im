# Teu-Im Web App

실시간 실제 통역 관리 플랫폼의 웹 앱 (Next.js 15 App Router).

---

## 프로젝트 개요

Teu-Im은 실시간 음성 통역을 위한 관리 플랫폼입니다. 프로젝트 소유자가 음성 세션을 생성하고, 참석자가 실시간으로 통역 결과를 확인할 수 있습니다.

**핵심 기능:**
- 프로젝트 & 세션 관리 (CRUD)
- Soniox STT를 통한 실시간 음성 인식
- 다국어 실시간 통역 (한국어, 영어, 일본어 등 29개 언어)
- 세션 분석 및 통계 대시보드
- 자막 파일 내보내기 (SRT, VTT)
- 조직 및 팀 관리

**기술 스택:**
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- Supabase (인증, DB, 실시간, Storage)

---

## 환경 설정 (Setup)

### 1. Node.js & pnpm 설치

```bash
# Node.js 20 이상 필요
node --version

# pnpm 설치
npm install -g pnpm
```

### 2. 모노레포 루트에서 의존성 설치

```bash
# 루트 디렉토리로 이동
cd /path/to/teu-im

# 의존성 설치
pnpm install
```

### 3. 환경 변수 설정

```bash
# .env.example을 기반으로 .env.local 생성
cp apps/web/.env.example apps/web/.env.local

# 텍스트 에디터로 실제 값 입력
# NEXT_PUBLIC_SUPABASE_URL — Supabase Dashboard > Settings > API
# NEXT_PUBLIC_SUPABASE_ANON_KEY — 위 동일 페이지
# SUPABASE_SERVICE_ROLE_KEY — 위 동일 페이지 (서버 전용!)
```

### 4. Supabase 마이그레이션 실행

```bash
# Supabase CLI 설치 후 (https://supabase.com/docs/guides/cli)
supabase login
supabase db push
```

### 5. 개발 서버 시작

```bash
# 웹 앱만
pnpm --filter @teu-im/web dev

# 전체 모노레포 (turbo)
pnpm dev
```

기본 URL: `http://localhost:3000`

---

## 환경 변수 (Environment Variables)

| 변수 | 필수 | 설명 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 예 | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 예 | Supabase 익명 키 (클라이언트 사용) |
| `SUPABASE_SERVICE_ROLE_KEY` | 예 | Supabase 서비스 역할 키 (서버 전용) |
| `NEXT_PUBLIC_APP_URL` | 선택 | 앱의 공개 URL (CORS 기준) |

> **보안 주의:** `SUPABASE_SERVICE_ROLE_KEY`는 절대로 클라이언트 측에 노출되지 않아야 합니다. `.env.local` 파일은 `.gitignore`에 포함되어 있습니다.

---

## API 엔드포인트

모든 API 경로는 `/api/` 접두사 아래 위치합니다. 대부분의 엔드포인트는 인증이 필요합니다.

### 프로젝트 관리

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/projects` | 프로젝트 목록 조회 |
| `POST` | `/api/projects` | 프로젝트 생성 |
| `GET` | `/api/projects/[id]` | 프로젝트 상세 조회 |
| `PATCH` | `/api/projects/[id]` | 프로젝트 수정 |
| `DELETE` | `/api/projects/[id]` | 프로젝트 삭제 |

### 세션 관리

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/projects/[id]/sessions` | 세션 시작 |
| `GET` | `/api/projects/[id]/sessions` | 세션 목록 조회 |
| `PATCH` | `/api/sessions/[sessionId]/status` | 세션 상태 변경 |
| `GET` | `/api/sessions/[sessionId]/history` | 세션 해석 내역 (커서 페이지네이션) |

### 오디오

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/sessions/[sessionId]/audio/chunks` | 오디오 청크 메타 등록 |
| `GET` | `/api/sessions/[sessionId]/audio/chunks` | 오디오 청크 목록 (presigned URL 포함) |

### 내보내기 & 검색

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/sessions/[sessionId]/export` | 자막 파일 내보내기 (SRT/VTT) |
| `GET` | `/api/projects/[id]/sessions/[sessionId]/export` | 프로젝트별 세션 내보내기 |
| `GET` | `/api/search` | 해석 내역 전문 검색 |

### 분석

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/projects/[id]/analytics` | 시간축 분석 데이터 |
| `GET` | `/api/projects/[id]/analytics/summary` | 프로젝트 요약 통계 |

### 인증 & 설정

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/join` | 참석자 프로젝트 참여 |
| `GET/POST/DELETE` | `/api/settings/soniox-key` | Soniox API 키 관리 |
| `POST` | `/api/soniox/temp-key` | 임시 Soniox 키 발급 (음성 인식용) |

---

## 배포 (Deployment)

### Vercel (권장)

1. GitHub 저장소를 Vercel에 연결
2. Root Directory: `.` (모노레포 루트)
3. `vercel.json` 설정이 빌드 및 출력 경로를 자동으로 처리
4. Environment Variables를 Vercel 대시보드에서 설정
5. `pnpm install` 후 자동 빌드 및 배포

### Docker

```bash
# Docker Compose로 로컬 개발 환경 시작
docker compose up -d

# 로그 확인
docker compose logs -f web
```

### CI/CD

`.github/workflows/ci.yml`에 GitHub Actions 파이프라인이 구성되어 있습니다:
- **Lint & Type Check** — Node.js 20, 22에서 동시 실행
- **Build Web** — Next.js 프로덕션 빌드 검증
- **Build Desktop** — Vite 번들 빌드
- **Security Audit** — 의존성 보안 감사

---

## 프리커밋 훅

`husky` + `lint-staged`로 커밋 전 자동 포맷팅 및 린팅이 활성화되어 있습니다.

```bash
# 초기 설치 시 자동으로 설정됨 (postinstall)
pnpm install
```

---

## 디렉토리 구조

```
apps/web/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # 인증 페이지 (login, signup)
│   ├── (dashboard)/              # 대시보드 레이아웃 및 페이지
│   │   ├── layout.tsx            # 사이드바 & 헤더
│   │   ├── projects/             # 프로젝트 관리 페이지
│   │   ├── sessions/             # 세션 상세 페이지
│   │   └── settings/             # 설정 페이지
│   ├── api/                      # API Route Handlers
│   │   ├── join/                 # 참석자 참여
│   │   ├── log/                  # 서버측 로그 수집
│   │   ├── projects/             # 프로젝트 CRUD & 분석
│   │   ├── search/               # 전문 검색
│   │   ├── sessions/             # 세션 관리 & 오디오
│   │   ├── settings/             # API 키 관리
│   │   └── soniox/               # Soniox 임시 키
│   ├── globals.css               # 글로벌 스타일
│   ├── layout.tsx                # 루트 레이아웃 (ErrorBoundary 포함)
│   └── page.tsx                  # 홈 페이지 (리다이렉트)
├── components/                   # 공유 UI 컴포넌트
│   ├── error-boundary.tsx        # 글로벌 에러 경계
│   ├── analytics/                # 분석 대시보드 컴포넌트
│   └── ...                       # 기타 컴포넌트
├── lib/                          # 유틸리티 및 클라이언트
│   ├── api-response.ts           # 표준화된 API 응답 헬퍼
│   ├── logger.ts                 # 앱 레벨 에러 로깅
│   ├── rate-limit.ts             # API 속도 제한
│   ├── validation.ts             # 입력 검증 유틸리티
│   ├── srt.ts                    # SRT 파싱 유틸
│   └── supabase/                 # Supabase 클라이언트 설정
├── middleware.ts                  # 인증 가드 + 속도 제한
├── .env.example                  # 환경 변수 템플릿
├── Dockerfile                    # 프로덕션 Docker 빌드
└── package.json
```
