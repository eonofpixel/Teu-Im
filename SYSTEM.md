# Teu-Im 시스템 문서

> 실시간 AI 통역 플랫폼 - 완전한 시스템 가이드

---

## 목차

1. [개요](#1-개요)
2. [아키텍처](#2-아키텍처)
3. [사용자 역할 및 플로우](#3-사용자-역할-및-플로우)
4. [기능별 상세](#4-기능별-상세)
5. [데이터베이스 스키마](#5-데이터베이스-스키마)
6. [API 엔드포인트](#6-api-엔드포인트)
7. [실시간 시스템](#7-실시간-시스템)
8. [보안](#8-보안)
9. [배포 및 운영](#9-배포-및-운영)

---

## 1. 개요

### 1.1 프로젝트 목적

Teu-Im은 회의, 컨퍼런스, 강연 등에서 **실시간 AI 통역**을 제공하는 플랫폼입니다.

- **발표자**: 마이크로 말하면 자동으로 음성인식 + 번역
- **청중**: 스마트폰/웹에서 실시간으로 번역된 내용 확인

### 1.2 핵심 기술

| 기술 | 용도 |
|------|------|
| **Soniox API** | 음성인식(STT) + 실시간 번역 |
| **Supabase** | 데이터베이스 + 인증 + Realtime 브로드캐스트 |
| **Next.js 15** | 웹/모바일 PWA |
| **Tauri 2.0** | 데스크톱 앱 |

### 1.3 지원 언어 (10개)

| 코드 | 언어 | 네이티브 |
|------|------|----------|
| `ko` | Korean | 한국어 |
| `en` | English | English |
| `ja` | Japanese | 日本語 |
| `zh` | Chinese | 中文 |
| `es` | Spanish | Español |
| `fr` | French | Français |
| `de` | German | Deutsch |
| `pt` | Portuguese | Português |
| `ru` | Russian | Русский |
| `ar` | Arabic | العربية |

---

## 2. 아키텍처

### 2.1 모노레포 구조

```
teu-im/
├── apps/
│   ├── web/          # Next.js 15 웹 관리앱 (발표자 대시보드)
│   ├── mobile/       # Next.js 15 모바일 PWA (청중용)
│   └── desktop/      # Tauri 2.0 데스크톱 앱 (녹음/송출)
├── packages/
│   ├── shared/       # 공유 타입 및 유틸리티
│   ├── ui/           # 디자인 시스템 컴포넌트
│   └── supabase/     # Supabase 클라이언트 팩토리
└── supabase/
    └── migrations/   # 데이터베이스 마이그레이션
```

### 2.2 기술 스택

| 영역 | 기술 |
|------|------|
| **프레임워크** | Next.js 15 (App Router), Tauri 2.0 |
| **언어** | TypeScript 5.3, Rust (Tauri) |
| **스타일링** | Tailwind CSS 4 |
| **상태관리** | React 19 hooks, Zustand (Desktop) |
| **데이터베이스** | Supabase (PostgreSQL) |
| **인증** | Supabase Auth |
| **실시간** | Supabase Realtime (WebSocket) |
| **패키지 관리** | pnpm 10, Turborepo |

### 2.3 데이터 플로우

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   발표자 앱     │     │   Soniox API    │     │    Supabase     │
│ (Desktop/Web)   │────▶│  (STT+번역)     │────▶│   (저장+실시간) │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │    청중 앱      │
                                               │ (Mobile/Web)    │
                                               └─────────────────┘
```

---

## 3. 사용자 역할 및 플로우

### 3.1 발표자 (Presenter)

> 웹 또는 데스크톱 앱을 사용하여 통역 세션을 관리합니다.

#### 3.1.1 가입 및 로그인

```
[/signup] ─────▶ [/api/auth/signup] ─────▶ [users 테이블 생성]
   │                                              │
   └── 이메일, 비밀번호, 이름 입력 ────────────────┘

[/login] ─────▶ [Supabase Auth] ─────▶ [/projects 대시보드]
```

#### 3.1.2 프로젝트 생성

```
[/projects/new]
   │
   ├── 프로젝트 이름 입력
   ├── 원본 언어 선택 (예: 한국어)
   └── 번역 언어 선택 (다중 선택 가능)
         │
         ▼
   [POST /api/projects]
         │
         ├── 6자리 참여 코드 자동 생성 (예: A1B2C3)
         └── 4자리 비밀번호 자동 생성 (예: XY7Z)
```

#### 3.1.3 Soniox API 키 설정

```
[/settings]
   │
   ├── 64자리 hex API 키 입력
   └── Soniox API로 유효성 검증
         │
         ▼
   [users.soniox_api_key에 저장]
```

#### 3.1.4 실시간 세션 진행

```
[/live] 또는 [Desktop App]
   │
   ├── 프로젝트 선택
   ├── "녹음 시작" 클릭
   │     └── 마이크 권한 요청
   │     └── Soniox WebSocket 연결
   │
   ├── 발표 중...
   │     ├── 음성 → Soniox STT → 번역
   │     └── interpretations 테이블에 저장
   │     └── Supabase Realtime로 청중에게 브로드캐스트
   │
   └── "세션 종료" 클릭
         └── 세션 상태 'ended'로 변경
```

#### 3.1.5 청중 공유 옵션

| 방법 | 설명 |
|------|------|
| **코드+비밀번호** | 청중이 직접 6자리 코드와 비밀번호 입력 |
| **QR 코드** | 스캔 시 자동으로 접속 (비밀번호 포함) |
| **링크 공유** | URL에 토큰 포함하여 원클릭 접속 |

### 3.2 청중 (Audience)

> 모바일 앱 또는 웹에서 실시간 통역 내용을 확인합니다.

#### 3.2.1 참여 방법 1: 코드+비밀번호 입력

```
[Mobile: /] 또는 [Web: /audience/{code}]
   │
   ├── 6자리 참여 코드 입력
   └── 비밀번호 입력
         │
         ▼
   [POST /api/join]
         │
         ├── 검증 성공 → 실시간 뷰로 이동
         └── 검증 실패 → 에러 메시지 표시
```

#### 3.2.2 참여 방법 2: QR 코드 스캔

```
QR 스캔 ─────▶ /audience/{CODE}?p={PASSWORD}
                     │
                     └── 자동으로 비밀번호 검증
                           └── 성공 시 바로 실시간 뷰
```

#### 3.2.3 참여 방법 3: 토큰 링크

```
링크 클릭 ─────▶ /audience/{CODE}?t={TOKEN}
                     │
                     └── 토큰으로 인증 (비밀번호 불필요)
                           └── 15분 후 만료
```

#### 3.2.4 실시간 뷰

```
[Mobile: /live/{code}] 또는 [Web: /audience/{code}]
   │
   ├── 연결 상태 표시 (녹색: 연결됨, 회색: 대기중)
   ├── 통역 카드 목록 (자동 스크롤)
   │     ├── 순서 번호 (#01, #02...)
   │     ├── 원본 텍스트 (작은 글씨)
   │     └── 번역 텍스트 (큰 글씨)
   │
   └── 언어 선택기 (다중 언어 시)
         └── "전체" 또는 특정 언어 필터
```

---

## 4. 기능별 상세

### 4.1 음성인식 및 번역 (Soniox)

#### 연결 방식
- **WebSocket**: `wss://stt-rt.soniox.com/transcribe`
- **인증**: Bearer 토큰 (사용자별 API 키)
- **오디오 포맷**: PCM_S16LE, 16kHz, 모노

#### 요청 설정
```json
{
  "model": "soniox-precision-ivr-20250107",
  "language": "ko",
  "translation": {
    "type": "one_way",
    "target_language": "en"
  }
}
```

#### 응답 형식
```json
{
  "tokens": [
    {
      "text": "안녕하세요",
      "is_final": true,
      "translation_status": "source"
    },
    {
      "text": "Hello",
      "translation_status": "translation"
    }
  ]
}
```

### 4.2 실시간 브로드캐스트

#### Supabase Realtime 구독
```typescript
supabase
  .channel(`session:${sessionId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'interpretations',
    filter: `session_id=eq.${sessionId}`
  }, handleNewInterpretation)
  .subscribe()
```

#### 재연결 로직
- `CHANNEL_ERROR` 또는 `TIMED_OUT` 시 3초 후 재연결
- 연결 상태 UI에 실시간 반영

### 4.3 자막 내보내기

#### 지원 포맷
| 포맷 | 확장자 | 타임스탬프 형식 |
|------|--------|----------------|
| SRT | `.srt` | `00:00:01,234` |
| WebVTT | `.vtt` | `00:00:01.234` |

#### API 사용법
```
GET /api/sessions/{sessionId}/export?format=srt&language=both&targetLanguage=en
```

#### 옵션
- `format`: `srt` 또는 `vtt`
- `language`: `original`, `translated`, `both`
- `targetLanguage`: 번역 언어 코드

### 4.4 분석 및 검색

#### 일일 분석
- `analytics_daily` 테이블에 집계 저장
- 세션 수, 총 시간, 단어 수 등

#### 전체 텍스트 검색
```sql
SELECT * FROM search_interpretations('검색어', project_id, 20, 0);
```

---

## 5. 데이터베이스 스키마

### 5.1 핵심 테이블

#### users
| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | PK, auth.users 연결 |
| `email` | TEXT | 이메일 |
| `name` | TEXT | 표시 이름 |
| `soniox_api_key` | TEXT | Soniox API 키 |

#### projects
| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users |
| `name` | TEXT | 프로젝트 이름 |
| `code` | CHAR(6) | 참여 코드 (UNIQUE) |
| `password` | CHAR(4) | 비밀번호 |
| `source_lang` | TEXT | 원본 언어 |
| `target_lang` | TEXT | 주 번역 언어 |
| `target_langs` | TEXT[] | 다중 번역 언어 |
| `status` | ENUM | idle/active/ended |

#### sessions
| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | PK |
| `project_id` | UUID | FK → projects |
| `status` | ENUM | active/paused/ended |
| `started_at` | TIMESTAMP | 시작 시간 |
| `ended_at` | TIMESTAMP | 종료 시간 |

#### interpretations
| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | PK |
| `session_id` | UUID | FK → sessions |
| `original_text` | TEXT | 원본 텍스트 |
| `translated_text` | TEXT | 번역 텍스트 |
| `target_language` | TEXT | 번역 언어 |
| `is_final` | BOOLEAN | 확정 여부 |
| `sequence` | INTEGER | 순서 번호 |
| `start_time_ms` | INTEGER | 시작 타임스탬프 |
| `end_time_ms` | INTEGER | 종료 타임스탬프 |

### 5.2 관계도

```
users (1) ──< (N) projects (1) ──< (N) sessions (1) ──< (N) interpretations
                    │                     │
                    │                     └──< (N) audio_chunks
                    │
                    └──< (N) organization_members >──(1) organizations
```

---

## 6. API 엔드포인트

### 6.1 인증

| 경로 | 메서드 | 설명 |
|------|--------|------|
| `/api/auth/signup` | POST | 회원가입 |
| `/api/join` | POST | 청중 참여 검증 |
| `/api/audience/token` | POST | 임시 토큰 발급 |

### 6.2 프로젝트

| 경로 | 메서드 | 설명 |
|------|--------|------|
| `/api/projects` | GET | 프로젝트 목록 |
| `/api/projects` | POST | 프로젝트 생성 |
| `/api/projects/[id]` | GET | 프로젝트 상세 |
| `/api/projects/[id]` | PUT | 프로젝트 수정 |
| `/api/projects/[id]` | DELETE | 프로젝트 삭제 |

### 6.3 세션

| 경로 | 메서드 | 설명 |
|------|--------|------|
| `/api/projects/[id]/sessions` | GET | 세션 목록 |
| `/api/projects/[id]/sessions` | POST | 세션 시작 |
| `/api/sessions/[sessionId]/status` | GET | 세션 상태 |
| `/api/sessions/[sessionId]/history` | GET | 통역 이력 |
| `/api/sessions/[sessionId]/export` | GET | 자막 내보내기 |

### 6.4 설정

| 경로 | 메서드 | 설명 |
|------|--------|------|
| `/api/settings/soniox-key` | GET | API 키 상태 확인 |
| `/api/settings/soniox-key` | POST | API 키 저장 |
| `/api/settings/soniox-key` | DELETE | API 키 삭제 |

---

## 7. 실시간 시스템

### 7.1 Supabase Realtime 설정

```sql
-- interpretations 테이블 실시간 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE interpretations;
```

### 7.2 클라이언트 구독 패턴

```typescript
// 청중 앱에서 실시간 구독
const channel = supabase
  .channel(`session:${sessionId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'interpretations',
    filter: `session_id=eq.${sessionId}`
  }, (payload) => {
    // 새 통역 처리
  })
  .subscribe();
```

### 7.3 Presence 추적

```typescript
// 청중 접속 현황 추적
const presenceChannel = supabase
  .channel(`presence:${sessionId}`)
  .on('presence', { event: 'sync' }, () => {
    const state = presenceChannel.presenceState();
    // 언어별 접속자 수 계산
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await presenceChannel.track({
        language: selectedLanguage,
        joinedAt: new Date().toISOString()
      });
    }
  });
```

---

## 8. 보안

### 8.1 인증 방식

| 사용자 | 방식 |
|--------|------|
| 발표자 | Supabase Auth (이메일/비밀번호) |
| 청중 | 프로젝트 코드 + 비밀번호 또는 토큰 |

### 8.2 Row Level Security (RLS)

```sql
-- 사용자는 자신의 데이터만 접근
CREATE POLICY "users_own_data" ON projects
  FOR ALL USING (auth.uid() = user_id);

-- 청중은 interpretations 읽기만 가능
CREATE POLICY "public_read_interpretations" ON interpretations
  FOR SELECT USING (true);
```

### 8.3 API 키 관리

- Soniox API 키는 `users.soniox_api_key`에 저장
- 현재 평문 저장 (향후 암호화 권장)
- 클라이언트에서는 마스킹된 값만 표시 (`abc12345...`)

### 8.4 청중 토큰

- 15분 만료 시간
- HMAC 서명으로 위변조 방지
- QR 코드에 포함하여 원클릭 접속

---

## 9. 배포 및 운영

### 9.1 환경변수

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# 앱 URL
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 9.2 빌드 명령

```bash
# 개발
pnpm dev

# 프로덕션 빌드
pnpm build

# 린트
pnpm lint
```

### 9.3 배포 플랫폼

| 앱 | 플랫폼 |
|----|--------|
| Web | Vercel |
| Mobile | Vercel (PWA) |
| Desktop | GitHub Releases (Tauri) |

### 9.4 모니터링

- `/api/log`: 클라이언트 에러 로깅
- Supabase Dashboard: DB 쿼리 및 실시간 연결 모니터링
- Vercel Analytics: 웹 성능 추적

---

## 부록: 주요 파일 위치

| 기능 | 파일 경로 |
|------|-----------|
| 발표자 대시보드 | `apps/web/app/(dashboard)/` |
| 청중 웹 뷰 | `apps/web/app/audience/` |
| 모바일 앱 | `apps/mobile/app/` |
| 데스크톱 앱 | `apps/desktop/src/` |
| 공유 타입 | `packages/shared/src/types/` |
| UI 컴포넌트 | `packages/ui/src/` |
| DB 스키마 | `supabase/migrations/` |
| API 라우트 | `apps/web/app/api/` |

---

*문서 생성일: 2026-01-29*
*버전: 1.0.0*
