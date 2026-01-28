# Teu-Im 실시간 통역 서비스 - 구현 계획

> 조사 결과 종합 및 프로덕션 실행 계획

---

## 1. 조사 결과 요약

### 1.1 데스크톱 프레임워크 결론: **Tauri 유지**

| 기준 | Tauri | Electron |
|------|-------|----------|
| 보안 | ACL 기반 권한, Rust 메모리 안전 | Node.js 직접 접근, 취약점 히스토리 |
| 앱 크기 | ~8MB | ~120MB |
| 메모리 | 30-40MB | 150-300MB |
| 오디오 처리 | cpal + 멀티스레딩 (Rust) | Web Audio API (즉시 사용) |
| 실제 사례 | Taurscribe (Whisper 통역 앱) | mic-speaker-streamer |

**결론**: Tauri는 보안과 성능에서 우수하며, 실시간 통역 앱에 적합. 이미 구현된 구조 유지.

### 1.2 오픈소스 활용 가능 항목

| 프로젝트 | 라이센스 | 활용 방안 | SaaS 가능 |
|----------|----------|-----------|-----------|
| **@soniox/speech-to-text-web** | MIT | 프론트엔드 STT 클라이언트 | O |
| **react-audio-visualize** | MIT | 파형 시각화 컴포넌트 | O |
| **LiveKit** | Apache 2.0 | WebRTC 인프라 (추후 확장) | O |
| **WhisperLiveKit** | Apache 2.0 | 자체 호스팅 대안 (추후) | O |

**핵심 활용**: `@soniox/speech-to-text-web` SDK를 Desktop 앱에서 직접 사용

### 1.3 Vercel + Supabase 아키텍처 결론

| 컴포넌트 | 결론 |
|----------|------|
| **Vercel** | 웹 호스팅에만 사용 (WebSocket 미지원) |
| **Supabase Realtime** | 텍스트 브로드캐스트에 충분 |
| **음성 스트림** | Desktop → Soniox 직접 연결 (서버 경유 X) |
| **비용** | Hobby 플랜으로 시작 가능 (~$45/월) |

**핵심 발견**: Vercel은 WebSocket을 지원하지 않지만, 음성은 Desktop에서 Soniox로 직접 연결하므로 문제 없음.

### 1.4 실시간 동기화 최적화

**현재 구현**: `postgres_changes` 구독
**권장 변경**: `Broadcast` 채널로 전환 (성능 개선)

```typescript
// Before (현재)
channel.on("postgres_changes", { event: "*", table: "interpretations", ... })

// After (권장)
channel.on("broadcast", { event: "interpretation", ... })
```

---

## 2. 최종 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │   Desktop    │────►│   Soniox     │────►│   Desktop    │                │
│  │   Microphone │     │   Cloud API  │     │   App        │                │
│  └──────────────┘     └──────────────┘     └──────┬───────┘                │
│         │                    │                     │                        │
│      50ms               30ms                    10ms                        │
│    (capture)         (STT+번역)              (처리)                         │
│                                                    │                        │
│                                                    ▼                        │
│                              ┌──────────────────────────────────┐          │
│                              │         Supabase                  │          │
│                              │   • INSERT interpretations       │          │
│                              │   • Broadcast to channel         │          │
│                              └──────────────┬───────────────────┘          │
│                                             │                              │
│                                          30ms                              │
│                                        (broadcast)                         │
│                                             │                              │
│                                             ▼                              │
│                              ┌──────────────────────────────────┐          │
│                              │   Mobile PWA / 2nd Monitor       │          │
│                              │   (총 ~120ms 지연)                │          │
│                              └──────────────────────────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 기술 스택 확정

### 3.1 프론트엔드

| 앱 | 기술 | 호스팅 |
|----|------|--------|
| 관리 웹 | Next.js 15 + React 19 | Vercel |
| 모바일 PWA | Next.js 15 (PWA) | Vercel |
| 데스크톱 | Tauri 2.0 + React 19 | GitHub Releases |

### 3.2 백엔드

| 서비스 | 기술 | 비용 |
|--------|------|------|
| API Routes | Next.js API (Vercel) | $0 (Hobby) |
| Database | Supabase PostgreSQL | $25/월 (Pro) |
| Auth | Supabase Auth | 포함 |
| Realtime | Supabase Realtime | 포함 |
| STT/번역 | Soniox API | ~$0.12/시간 |

### 3.3 신규 추가 패키지

```json
{
  "dependencies": {
    "@soniox/speech-to-text-web": "^1.4.0",
    "react-audio-visualize": "^1.2.0"
  }
}
```

---

## 4. 구현 우선순위

### Critical Path (P0) - 서비스 동작 필수

```
┌─────────────────────────────────────────────────────────────────┐
│  Week 1: Core Integration                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. /api/soniox/temp-key API 구현                               │
│     └── Master API key로 임시 키 발급                           │
│                                                                 │
│  2. Desktop Soniox SDK 연동                                     │
│     └── @soniox/speech-to-text-web 실제 연동                    │
│     └── Temp key 요청 → 연결 → 스트리밍                         │
│                                                                 │
│  3. Desktop → Supabase 저장                                     │
│     └── 통역 결과 interpretations 테이블 INSERT                 │
│     └── Realtime broadcast 트리거                               │
│                                                                 │
│  4. E2E 테스트                                                  │
│     └── 마이크 → STT → 번역 → DB → Mobile 전체 흐름             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### High Priority (P1) - 프로덕션 배포 필수

```
┌─────────────────────────────────────────────────────────────────┐
│  Week 2: Production Readiness                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  5. Admin Web API 완성                                          │
│     └── /api/projects/* CRUD                                    │
│     └── /api/settings/soniox-key (암호화 저장)                  │
│                                                                 │
│  6. Admin Web Auth 연동                                         │
│     └── Supabase Auth 실제 연동                                 │
│                                                                 │
│  7. 2차 모니터 기능                                             │
│     └── Tauri 멀티 윈도우                                       │
│     └── 프레젠테이션 모드 UI                                    │
│                                                                 │
│  8. 배포 파이프라인                                             │
│     └── GitHub Actions (Windows/macOS 빌드)                     │
│     └── Vercel 자동 배포                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Medium Priority (P2) - 안정화

```
┌─────────────────────────────────────────────────────────────────┐
│  Week 3+: Polish & Scale                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  9. 오프라인/재연결 처리                                        │
│     └── 로컬 버퍼링 (IndexedDB)                                 │
│     └── Exponential backoff 재연결                              │
│                                                                 │
│  10. 파형 시각화                                                │
│      └── react-audio-visualize 적용                             │
│                                                                 │
│  11. 코드 서명                                                  │
│      └── Windows EV 인증서                                      │
│      └── macOS Developer ID + Notarization                      │
│                                                                 │
│  12. 성능 최적화                                                │
│      └── 메시지 배칭 (500ms 윈도우)                             │
│      └── Broadcast 채널 전환                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. API 설계 상세

### 5.1 POST /api/soniox/temp-key

**목적**: Desktop 앱에서 세션 시작 전 임시 API 키 발급

**요청**:
```typescript
{
  projectId: string;  // 유효성 검증용
}
```

**응답**:
```typescript
{
  tempApiKey: string;     // 1시간 유효
  expiresAt: string;      // ISO 8601
  websocketUrl: string;   // wss://stt-rt.soniox.com/transcribe-websocket
}
```

**서버 로직**:
```typescript
// 1. 사용자 인증 확인 (Supabase Auth)
// 2. 프로젝트 소유권 확인
// 3. 사용자의 master API key 복호화
// 4. Soniox API로 temp key 발급 요청
// 5. temp key 반환
```

### 5.2 POST /api/projects

**요청**:
```typescript
{
  name: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
}
```

**응답**:
```typescript
{
  id: string;
  code: string;      // 자동 생성 6자리
  password: string;  // 자동 생성
  ...
}
```

### 5.3 POST /api/join (참석자용)

**요청**:
```typescript
{
  code: string;      // 6자리 프로젝트 코드
  password: string;
}
```

**응답**:
```typescript
{
  sessionId: string | null;  // 활성 세션이 있으면
  projectName: string;
  sourceLanguage: string;
  targetLanguage: string;
}
```

---

## 6. Desktop 앱 구현 상세

### 6.1 Soniox 연동 코드 (soniox.ts 완성본)

```typescript
import { SonioxClient } from '@soniox/speech-to-text-web';
import { supabase } from '@teu-im/supabase';

interface SonioxConfig {
  sessionId: string;
  sourceLanguage: string;
  targetLanguage: string;
  onPartialResult: (result: TranscriptionResult) => void;
  onFinalResult: (result: TranscriptionResult) => void;
  onError: (error: Error) => void;
}

let client: SonioxClient | null = null;
let sequence = 0;

export async function startSoniox(config: SonioxConfig): Promise<void> {
  // 1. Temp API Key 요청
  const response = await fetch('/api/soniox/temp-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId: config.sessionId }),
  });

  const { tempApiKey } = await response.json();

  // 2. Soniox 클라이언트 생성
  client = new SonioxClient({
    apiKey: tempApiKey,
  });

  sequence = 0;

  // 3. 스트리밍 시작
  await client.start({
    model: 'stt-rt-v3',
    languageHints: [config.sourceLanguage],
    translation: {
      mode: 'one_way',
      targetLanguage: config.targetLanguage,
    },

    onPartialResult: async (result) => {
      config.onPartialResult(result);

      // Partial 결과도 DB에 저장 (UI 업데이트용)
      await saveInterpretation(config.sessionId, result, false);
    },

    onFinalResult: async (result) => {
      config.onFinalResult(result);

      // Final 결과 DB 저장
      await saveInterpretation(config.sessionId, result, true);
    },

    onError: config.onError,
  });
}

export async function stopSoniox(): Promise<void> {
  if (client) {
    await client.stop();
    client = null;
  }
}

async function saveInterpretation(
  sessionId: string,
  result: TranscriptionResult,
  isFinal: boolean
): Promise<void> {
  const originalText = result.tokens
    .filter(t => !t.isTranslation)
    .map(t => t.text)
    .join('');

  const translatedText = result.tokens
    .filter(t => t.isTranslation)
    .map(t => t.text)
    .join('');

  if (!originalText && !translatedText) return;

  sequence++;

  const { error } = await supabase
    .from('interpretations')
    .upsert({
      session_id: sessionId,
      original_text: originalText,
      translated_text: translatedText,
      is_final: isFinal,
      sequence,
    }, {
      onConflict: 'session_id,sequence',
    });

  if (error) {
    console.error('Failed to save interpretation:', error);
  }
}
```

### 6.2 Interpreter 페이지 연동

```typescript
// apps/desktop/src/pages/Interpreter.tsx 수정 사항

import { startSoniox, stopSoniox } from '../lib/soniox';

const handleStartReceiving = async () => {
  setIsRecording(true);

  await startSoniox({
    sessionId: currentSession.id,
    sourceLanguage: currentProject.sourceLanguage,
    targetLanguage: currentProject.targetLanguage,
    onPartialResult: (result) => {
      setCurrentOriginal(result.original);
      setCurrentTranslated(result.translated);
    },
    onFinalResult: (result) => {
      setHistory(prev => [...prev, result]);
    },
    onError: (error) => {
      console.error('Soniox error:', error);
      setIsRecording(false);
    },
  });
};

const handleStop = async () => {
  await stopSoniox();
  setIsRecording(false);
};
```

---

## 7. 비용 분석

### 7.1 월간 예상 비용 (소규모: 월 50시간 통역)

| 항목 | 비용 |
|------|------|
| Vercel (Hobby) | $0 |
| Supabase (Pro) | $25 |
| Soniox (50시간 × $0.12) | $6 |
| **합계** | **$31/월** |

### 7.2 중규모 (월 200시간, 동시 50세션)

| 항목 | 비용 |
|------|------|
| Vercel (Pro) | $20 |
| Supabase (Pro) | $25 |
| Soniox (200시간) | $24 |
| **합계** | **$69/월** |

---

## 8. 리스크 및 완화

| 리스크 | 확률 | 영향 | 완화 전략 |
|--------|------|------|-----------|
| Soniox API 장애 | 낮음 | 높음 | 로컬 버퍼링, 재연결 로직 |
| Supabase Realtime 제한 | 중간 | 중간 | Pro 플랜, 메시지 배칭 |
| 코드 서명 비용 | 확실 | 낮음 | 초기 unsigned, 후 서명 |
| Tauri WebView 호환성 | 중간 | 중간 | 양 플랫폼 동시 테스트 |

---

## 9. 마일스톤

| 마일스톤 | 목표 | 완료 기준 |
|----------|------|----------|
| **M1: Core Flow** | Week 1 | 마이크 → 번역 → Mobile 표시 동작 |
| **M2: Admin Complete** | Week 2 | 프로젝트 생성/관리 가능 |
| **M3: Production** | Week 3 | 빌드 자동화, 배포 완료 |
| **M4: Polish** | Week 4 | 재연결, 2차 모니터, 안정화 |

---

## 10. 다음 단계

1. **즉시 실행**: Soniox Temp Key API 구현
2. **이후**: Desktop Soniox SDK 연동
3. **이후**: E2E 테스트로 전체 흐름 검증

모든 P0 작업 완료 후 실제 통역 세션 테스트 가능.
