# Teu-Im 개선 계획

> 직관적이고 쉬운 사용 및 운영을 위한 로드맵

---

## 개선 우선순위

| 우선순위 | 설명 | 목표 |
|----------|------|------|
| **P0** | 크리티컬 버그 | 즉시 수정 필요 |
| **P1** | 핵심 UX 개선 | 1주 내 |
| **P2** | 아키텍처 개선 | 2주 내 |
| **P3** | 기능 강화 | 점진적 |

---

## P0: 크리티컬 버그 수정

### 1. 청중 비밀번호 인증 문제

**현상**: 청중이 올바른 비밀번호를 입력해도 "비밀번호가 일치하지 않습니다" 오류

**원인 분석**:
- 웹 API (`/api/join`): `password.toUpperCase()` 사용
- 모바일 앱: `password.toUpperCase()` 사용 (수정 완료)
- 웹 청중 페이지: 검증 로직 확인 필요

**수정 사항**:
```typescript
// apps/web/app/audience/[code]/page.tsx
// 비밀번호 비교 시 대문자 변환 확인
if (project.password !== inputPassword.toUpperCase()) {
  // 에러
}
```

**상태**: 모바일 수정 완료, 웹 청중 페이지 확인 필요

---

### 2. 청중 링크 접속 시 무한 로딩

**현상**: `?t={TOKEN}` 또는 `?p={PASSWORD}` URL로 접속 시 로딩만 계속

**원인 가설**:
1. 토큰 파싱 오류
2. API 응답 지연
3. 세션 상태 확인 실패
4. Supabase Realtime 연결 실패

**디버깅 순서**:
```
1. 브라우저 개발자 도구 > Network 탭 확인
2. /api/join 응답 확인
3. Supabase Realtime 연결 상태 확인
4. 콘솔 에러 메시지 확인
```

**수정 방향**:
- 로딩 타임아웃 추가 (10초)
- 실패 시 에러 메시지 표시
- 재시도 버튼 제공

---

## P1: 핵심 UX 개선

### 1. 프로젝트 액션 메뉴 개선

**현재 문제**:
- 호버 시에만 메뉴 버튼 표시
- 모바일에서 호버 불가
- z-index 문제로 클릭이 다른 곳으로 이동 (수정 완료)

**개선안**:
```tsx
// 항상 표시되는 액션 버튼
<div className="absolute top-3 right-3">
  <ActionMenu
    onEdit={...}
    onDelete={...}
    onShare={...}
  />
</div>
```

**추가 기능**:
- 공유 버튼 (QR 코드 모달)
- 복제 버튼
- 보관 기능

---

### 2. 모바일 터치 최적화

**현재 문제**:
- 작은 터치 타겟
- 스와이프 제스처 없음
- 긴 텍스트 잘림

**개선안**:
```css
/* 최소 터치 타겟 44x44px */
.touch-target {
  min-height: 44px;
  min-width: 44px;
  padding: 12px;
}

/* 카드 스와이프 액션 */
.card-swipe-left {
  /* 삭제 액션 표시 */
}
```

---

### 3. 실시간 연결 상태 개선

**현재 문제**:
- 연결 끊김 시 알림 미흡
- 재연결 시도 상태 불명확

**개선안**:
```tsx
// 연결 상태 배너
<ConnectionBanner status={status}>
  {status === 'connected' && '실시간 연결됨'}
  {status === 'reconnecting' && '재연결 중... (3초 후 재시도)'}
  {status === 'error' && (
    <>
      연결 실패
      <button onClick={retry}>다시 연결</button>
    </>
  )}
</ConnectionBanner>
```

---

### 4. 세션 진행 중 공유 개선

**현재 문제**:
- QR 코드가 작음
- 공유 옵션이 숨겨져 있음

**개선안**:
- 플로팅 공유 버튼 추가
- 전체화면 QR 코드 모달
- 코드/비밀번호 큰 글씨 표시
- 클립보드 복사 버튼

---

## P2: 아키텍처 개선

### 1. Supabase 클라이언트 통합

**현재 문제**:
```
apps/web/lib/supabase/client.ts    # 웹 클라이언트
apps/web/lib/supabase/server.ts    # 서버 클라이언트
apps/mobile/lib/supabase/client.ts # 모바일 (중복)
packages/supabase/                  # 패키지 (미사용?)
```

**개선안**:
```
packages/supabase/
├── client.ts      # 브라우저용
├── server.ts      # 서버용
└── types.ts       # Database 타입
```

```typescript
// apps/web/lib/supabase/client.ts
export { getSupabaseClient } from '@teu-im/supabase/client';
```

---

### 2. 모바일 앱 아키텍처

**현재 문제**:
- 모바일 앱이 Supabase 직접 쿼리
- 비밀번호 검증이 클라이언트에서 수행

**개선안**:
- 모든 데이터 접근은 API 경유
- 클라이언트에서 비밀번호 직접 비교 금지

```typescript
// Before (취약)
const { data: project } = await supabase
  .from('projects')
  .select('password')
  .eq('code', code)
  .single();

if (project.password !== inputPassword) { ... }

// After (안전)
const response = await fetch('/api/join', {
  method: 'POST',
  body: JSON.stringify({ code, password })
});
```

---

### 3. API 응답 표준화

**현재 상태**: 각 API마다 다른 응답 형식

**개선안**:
```typescript
// 표준 응답 형식
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// 성공
{ success: true, data: { ... } }

// 실패
{ success: false, error: { code: 'INVALID_PASSWORD', message: '...' } }
```

---

## P3: 기능 강화

### 1. 프로젝트 설정 페이지

**현재**: 프로젝트 생성 후 수정 불가

**추가 기능**:
- 이름 변경
- 언어 설정 변경
- 비밀번호 재생성
- 코드 재생성
- 접근 통계

---

### 2. 세션 히스토리 타임라인

**현재**: 텍스트 목록만 표시

**개선안**:
- 시간 기반 타임라인 UI
- 오디오 동기화 재생
- 구간 검색
- 북마크 기능

---

### 3. 오프라인 지원 (PWA)

**현재**: 온라인 필수

**개선안**:
- Service Worker로 앱 캐싱
- 이전 세션 오프라인 보기
- 연결 복구 시 자동 동기화

---

### 4. 팀 협업 기능

**현재**: 개인 계정만 지원

**개선안**:
- 조직 생성
- 멤버 초대
- 역할 기반 권한 (owner/admin/interpreter/viewer)
- 프로젝트 공유

---

## 디자인 개선

### 1. 일관된 색상 시스템

```css
:root {
  /* Primary - Indigo */
  --color-primary: #6366f1;
  --color-primary-hover: #4f46e5;

  /* Status */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;

  /* Background */
  --color-bg-primary: #0f172a;
  --color-bg-secondary: #1e293b;
  --color-bg-tertiary: #334155;

  /* Text */
  --color-text-primary: #f8fafc;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;
}
```

---

### 2. 반응형 레이아웃

| 브레이크포인트 | 용도 |
|---------------|------|
| `sm` (640px) | 모바일 |
| `md` (768px) | 태블릿 |
| `lg` (1024px) | 데스크톱 |
| `xl` (1280px) | 대형 화면 |

---

### 3. 접근성 (a11y)

- 키보드 네비게이션
- 스크린 리더 지원
- 고대비 모드
- 포커스 표시

---

## 구현 로드맵

### 이번 주 (P0)
- [ ] 청중 비밀번호 문제 완전 해결
- [ ] 청중 링크 무한 로딩 수정
- [ ] 에러 로깅 강화

### 다음 주 (P1)
- [ ] 프로젝트 액션 메뉴 상시 표시
- [ ] 모바일 터치 타겟 확대
- [ ] 연결 상태 UI 개선

### 2주차 (P2)
- [ ] Supabase 클라이언트 통합
- [ ] 모바일 API 경유 방식 전환
- [ ] API 응답 표준화

### 이후 (P3)
- [ ] 프로젝트 설정 페이지
- [ ] 팀 협업 기능
- [ ] PWA 오프라인 지원

---

*계획 수립일: 2026-01-29*
*버전: 1.0.0*
