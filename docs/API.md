# Teu-Im API Documentation

Complete reference for all REST API endpoints in the Teu-Im web application.

## Overview

The Teu-Im API provides a RESTful interface for managing projects, sessions, audio, and attendee access. All endpoints return JSON and follow a consistent response format.

**Base URL**: `https://your-domain.com/api`

**Authentication**: Most endpoints require Supabase authentication via bearer token or session cookie.

## Response Format

### Success Response
```json
{
  "data": { /* endpoint-specific data */ },
  "meta": { /* optional pagination or metadata */ }
}
```

Status codes: `200`, `201`, `204`

### Error Response
```json
{
  "error": "Error message in Korean"
}
```

Common error responses:
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource not found)
- `409` - Conflict (state conflict, e.g., duplicate session)
- `429` - Rate Limited (too many requests)
- `500` - Internal Server Error

## Common Response Headers

All responses include:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

Rate-limited endpoints include:
```
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1704067200
```

## Endpoints by Domain

---

# Authentication Endpoints

## POST /api/auth/signup

Create a new user account.

**Access**: Public

**Request**:
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "User Name"
}
```

**Response** (`201`):
```json
{
  "success": true,
  "message": "회원가입이 완료되었습니다",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com"
  }
}
```

**Validation**:
- `email` - Required, valid email format
- `password` - Required, minimum 8 characters
- `name` - Optional

**Errors**:
- `400` - Invalid email or password too short
- `400` - Email already registered
- `500` - Account creation failed

---

# Project Endpoints

## GET /api/projects

List all projects for the authenticated user.

**Access**: Authenticated users only

**Query Parameters**: None

**Response** (`200`):
```json
{
  "projects": [
    {
      "id": "proj-123",
      "name": "Q4 Conference 2024",
      "code": "CONF24",
      "password": "AB12",
      "source_lang": "ko",
      "target_lang": "en",
      "target_langs": ["en", "ja", "zh"],
      "status": "idle",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Caching**: 10 seconds

**Errors**:
- `401` - Unauthorized

---

## POST /api/projects

Create a new interpretation project.

**Access**: Authenticated users only

**Request**:
```json
{
  "name": "Q4 Conference 2024",
  "sourceLanguage": "ko",
  "targetLanguages": ["en", "ja", "zh"]
}
```

**Response** (`201`):
```json
{
  "project": {
    "id": "proj-123",
    "name": "Q4 Conference 2024",
    "code": "CONF24",
    "password": "AB12",
    "source_lang": "ko",
    "target_lang": "en",
    "target_langs": ["en", "ja", "zh"],
    "status": "idle",
    "user_id": "user-123",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

**Validation**:
- `name` - Required, 1-100 characters
- `sourceLanguage` - Required, valid language code (ko, en, ja, zh, es, fr, de, it, pt, ru, ar, hi, th, vi, id, ms, ca, da, el, he, hu, lt, nl, no, pl, ro, sv, tr, uk)
- `targetLanguages` - Required, array of valid language codes, non-empty

**Errors**:
- `400` - Invalid input validation
- `401` - Unauthorized
- `500` - Project code generation failed

**Notes**:
- Unique `code` is auto-generated (6 characters)
- Random 4-digit `password` is auto-generated
- Project starts in `idle` status

---

## GET /api/projects/[id]

Get details for a specific project.

**Access**: Project owner only

**Parameters**:
- `id` - Project UUID

**Response** (`200`):
```json
{
  "project": {
    "id": "proj-123",
    "name": "Q4 Conference 2024",
    "code": "CONF24",
    "password": "AB12",
    "source_lang": "ko",
    "target_lang": "en",
    "target_langs": ["en", "ja", "zh"],
    "status": "idle",
    "user_id": "user-123",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

**Errors**:
- `401` - Unauthorized
- `404` - Project not found or not owned by user

---

## PATCH /api/projects/[id]

Update project details.

**Access**: Project owner only

**Parameters**:
- `id` - Project UUID

**Request**:
```json
{
  "name": "Q4 Conference 2024 - Updated",
  "source_lang": "ko",
  "target_lang": "en",
  "target_langs": ["en", "ja"],
  "status": "active",
  "regeneratePassword": true,
  "regenerateCode": true
}
```

**Response** (`200`):
```json
{
  "project": {
    "id": "proj-123",
    "name": "Q4 Conference 2024 - Updated",
    "code": "NEW24",
    "password": "CD34",
    "source_lang": "ko",
    "target_lang": "en",
    "target_langs": ["en", "ja"],
    "status": "active",
    "updated_at": "2024-01-15T11:45:00Z"
  }
}
```

**Allowed Fields**:
- `name` - Project name
- `source_lang` - Source language code
- `target_lang` - Primary target language (legacy)
- `target_langs` - Array of target languages
- `status` - Project status (idle, active, paused)
- `regeneratePassword` - Set to `true` to generate new 4-digit password
- `regenerateCode` - Set to `true` to generate new 6-digit code

**Errors**:
- `401` - Unauthorized
- `404` - Project not found
- `500` - Update failed

---

## DELETE /api/projects/[id]

Delete a project and all associated sessions.

**Access**: Project owner only

**Parameters**:
- `id` - Project UUID

**Response** (`200`):
```json
{
  "success": true
}
```

**Errors**:
- `401` - Unauthorized
- `404` - Project not found
- `500` - Deletion failed

**Warning**: This operation is irreversible and deletes all associated sessions and data.

---

# Session Endpoints

## POST /api/projects/[id]/sessions

Start a new interpretation session for a project.

**Access**: Project owner only

**Parameters**:
- `id` - Project UUID

**Request**: Empty body or `{}`

**Response** (`201`):
```json
{
  "session": {
    "id": "sess-456",
    "project_id": "proj-123",
    "status": "active",
    "started_at": "2024-01-15T12:00:00Z",
    "ended_at": null,
    "created_at": "2024-01-15T12:00:00Z"
  }
}
```

**Errors**:
- `401` - Unauthorized
- `404` - Project not found
- `409` - Active session already exists for this project
- `500` - Session creation failed

**Notes**:
- A project can only have one active session
- Project status is automatically updated to `active`
- Session starts in `active` status

---

## GET /api/projects/[id]/sessions

List all sessions for a project.

**Access**: Project owner only

**Parameters**:
- `id` - Project UUID

**Query Parameters**: None

**Response** (`200`):
```json
{
  "sessions": [
    {
      "id": "sess-456",
      "project_id": "proj-123",
      "status": "ended",
      "started_at": "2024-01-15T12:00:00Z",
      "ended_at": "2024-01-15T12:30:00Z",
      "created_at": "2024-01-15T12:00:00Z"
    }
  ]
}
```

**Errors**:
- `401` - Unauthorized
- `404` - Project not found

---

## PATCH /api/sessions/[sessionId]/status

Update session status (pause, resume, end).

**Access**: Project owner only

**Parameters**:
- `sessionId` - Session UUID

**Request**:
```json
{
  "status": "paused"
}
```

**Response** (`200`):
```json
{
  "session": {
    "id": "sess-456",
    "project_id": "proj-123",
    "status": "paused",
    "started_at": "2024-01-15T12:00:00Z",
    "ended_at": null,
    "updated_at": "2024-01-15T12:15:00Z"
  }
}
```

**Valid Status Values**: `active`, `paused`, `ended`

**Valid State Transitions**:
- `idle` → `active`
- `active` → `paused`, `ended`
- `paused` → `active`, `ended`
- `ended` → (no transitions allowed)

**Errors**:
- `400` - Invalid or missing status
- `401` - Unauthorized
- `404` - Session not found
- `409` - Invalid state transition

**Notes**:
- When session is ended, `ended_at` is automatically set to current time
- Only project owner can change session status

---

## GET /api/sessions/[sessionId]/history

Get interpretation history for a session with cursor-based pagination.

**Access**: Project owner only

**Parameters**:
- `sessionId` - Session UUID

**Query Parameters**:
- `limit` - Items per page (default: 50, max: 200)
- `cursor` - Base64-encoded cursor for next page (from `pagination.next_cursor`)
- `language` - Filter by target language code (e.g., "en", "ja")
- `include_chunks` - Include audio chunks in response (default: true, set to "false" to exclude)

**Response** (`200`):
```json
{
  "interpretations": [
    {
      "id": "interp-789",
      "sequence": 1,
      "original_text": "안녕하세요, 회의를 시작하겠습니다.",
      "translated_text": "Hello, let me start the meeting.",
      "target_language": "en",
      "is_final": true,
      "start_time_ms": 0,
      "end_time_ms": 3500,
      "created_at": "2024-01-15T12:00:05Z"
    }
  ],
  "audio_chunks": [
    {
      "id": "chunk-101",
      "chunk_index": 0,
      "storage_path": "sessions/sess-456/audio-chunk-0.wav",
      "start_time_ms": 0,
      "end_time_ms": 5000,
      "duration_ms": 5000,
      "file_size_bytes": 160000,
      "signed_url": "https://...",
      "created_at": "2024-01-15T12:00:05Z"
    }
  ],
  "session": {
    "id": "sess-456",
    "status": "ended",
    "started_at": "2024-01-15T12:00:00Z",
    "ended_at": "2024-01-15T12:30:00Z",
    "audio_duration_ms": 1800000
  },
  "pagination": {
    "next_cursor": "eyJzZXF1ZW5jZSI6NTAsImlkIjoiaW50ZXJwLWFiYzEyMyJ9",
    "has_more": true,
    "count": 50,
    "total": 324
  }
}
```

**Pagination Algorithm**:
- Uses sequence number + id for stable cursor
- Cursor is base64-encoded JSON: `{sequence: number, id: string}`
- `has_more` indicates if there are more results
- Always fetch with limit+1 to determine if more results exist

**Errors**:
- `400` - Invalid cursor format
- `401` - Unauthorized
- `403` - Project ownership verification failed
- `404` - Session not found
- `500` - Query failed

**Notes**:
- Only returns finalized interpretations (`is_final: true`)
- Audio chunks included only for interpretations with timing data
- Signed URLs valid for 1 hour

---

## GET /api/sessions/[sessionId]/export

Export session data as SRT or CSV.

**Access**: Project owner only

**Parameters**:
- `sessionId` - Session UUID

**Query Parameters**:
- `format` - Export format: `srt` or `csv` (default: `srt`)
- `language` - Filter by target language (optional)

**Response** (`200`):
- Content-Type: `text/plain` (SRT) or `text/csv` (CSV)
- Headers: `Content-Disposition: attachment; filename="session-ID.srt"`

**SRT Format Example**:
```
1
00:00:00,000 --> 00:00:03,500
Hello, let me start the meeting.

2
00:00:03,500 --> 00:00:07,200
Today's agenda includes...
```

**CSV Format Example**:
```
sequence,original_text,translated_text,target_language,start_time_ms,end_time_ms,created_at
1,"안녕하세요...","Hello...","en",0,3500,"2024-01-15T12:00:05Z"
```

**Errors**:
- `400` - Invalid format parameter
- `401` - Unauthorized
- `404` - Session not found
- `500` - Export generation failed

---

# Audio Chunk Endpoints

## POST /api/sessions/[sessionId]/audio/chunks

Register audio chunk metadata after uploading to storage.

**Access**: Project owner only

**Parameters**:
- `sessionId` - Session UUID

**Request**:
```json
{
  "chunk_index": 0,
  "storage_path": "sessions/sess-456/audio-chunk-0.wav",
  "start_time_ms": 0,
  "end_time_ms": 5000,
  "file_size_bytes": 160000
}
```

**Response** (`201`):
```json
{
  "chunk": {
    "id": "chunk-101",
    "session_id": "sess-456",
    "chunk_index": 0,
    "storage_path": "sessions/sess-456/audio-chunk-0.wav",
    "start_time_ms": 0,
    "end_time_ms": 5000,
    "duration_ms": 5000,
    "file_size_bytes": 160000,
    "created_at": "2024-01-15T12:00:05Z"
  }
}
```

**Validation**:
- `chunk_index` - Required, non-negative integer, unique per session
- `storage_path` - Required, non-empty string
- `start_time_ms` - Required, non-negative integer
- `end_time_ms` - Required, must be greater than `start_time_ms`
- `file_size_bytes` - Required, non-negative integer

**Errors**:
- `400` - Missing or invalid parameters
- `401` - Unauthorized
- `403` - Project ownership verification failed
- `404` - Session not found
- `409` - Duplicate chunk index for session
- `500` - Insert failed

---

## GET /api/sessions/[sessionId]/audio/chunks

List audio chunks for a session with presigned URLs.

**Access**: Project owner only

**Parameters**:
- `sessionId` - Session UUID

**Query Parameters**:
- `limit` - Items per page (default: 100, max: 500)
- `offset` - Pagination offset (default: 0)

**Response** (`200`):
```json
{
  "chunks": [
    {
      "id": "chunk-101",
      "session_id": "sess-456",
      "chunk_index": 0,
      "storage_path": "sessions/sess-456/audio-chunk-0.wav",
      "start_time_ms": 0,
      "end_time_ms": 5000,
      "duration_ms": 5000,
      "file_size_bytes": 160000,
      "signed_url": "https://...",
      "created_at": "2024-01-15T12:00:05Z"
    }
  ],
  "total": 36,
  "limit": 100,
  "offset": 0
}
```

**Errors**:
- `401` - Unauthorized
- `403` - Project ownership verification failed
- `404` - Session not found
- `500` - Query failed

**Notes**:
- Signed URLs valid for 1 hour
- Chunks ordered by `chunk_index`
- Limit capped at 500 for performance

---

# Audience Endpoints

## POST /api/audience/token

Generate a temporary access token for attendees to join a project.

**Access**: Public (rate-limited)

**Request**:
```json
{
  "code": "CONF24",
  "password": "AB12"
}
```

**Response** (`200`):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2024-01-15T12:15:00Z",
  "projectId": "proj-123",
  "sessionId": "sess-456"
}
```

**Headers**:
```
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1705324200
```

**Validation**:
- `code` - Required, 1-20 characters, converted to uppercase
- `password` - Required, 1-50 characters, converted to uppercase

**Errors**:
- `400` - Invalid input validation
- `404` - Project not found or password incorrect (intentionally ambiguous for security)
- `429` - Rate limited (5 requests per minute per IP)
- `500` - Token generation failed

**Notes**:
- Token valid for 15 minutes
- Token contains projectId and sessionId (if active)
- Rate limited: 5 requests per minute per IP
- Password check intentionally doesn't distinguish between invalid code and wrong password
- On successful auth, rate limit counter is reset for that IP

---

## POST /api/join

Join a project as an attendee with credentials or token.

**Access**: Public (rate-limited)

**Request (Password Path)**:
```json
{
  "code": "CONF24",
  "password": "AB12"
}
```

**Request (Token Path)**:
Headers: `x-audience-token: <token-from-/api/audience/token>`

**Response** (`200`):
```json
{
  "projectId": "proj-123",
  "projectName": "Q4 Conference 2024",
  "sourceLanguage": "ko",
  "targetLanguage": "en",
  "status": "active",
  "sessionId": "sess-456"
}
```

**Validation**:
- `code` - Required (password path)
- `password` - Required (password path)
- `x-audience-token` header - Required (token path)

**Errors**:
- `400` - Invalid input
- `401` - Invalid or expired token (token path)
- `404` - Project not found or invalid password (password path)
- `429` - Rate limited
- `500` - Internal error

**Notes**:
- Supports two authentication paths: credentials or token
- Token path bypasses password check
- Rate limited: 5 requests per minute per project code (password path)
- Returns active session if one exists, otherwise `null`

---

# Utility Endpoints

## POST /api/soniox/temp-key

Get temporary Soniox API key for real-time speech-to-text.

**Access**: Authenticated users only

**Request**:
```json
{
  "projectId": "proj-123"
}
```

**Response** (`200`):
```json
{
  "tempApiKey": "sk-temp-...",
  "expiresAt": "2024-01-15T13:00:00Z",
  "websocketUrl": "wss://stt-rt.soniox.com/transcribe-websocket"
}
```

**Errors**:
- `400` - Soniox API key not configured for user
- `401` - Unauthorized
- `403` - Project ownership verification failed
- `404` - Project not found
- `502` - Soniox API error
- `500` - Internal error

**Notes**:
- User must have Soniox API key configured in settings
- Temporary key valid for 5 minutes (300 seconds)
- Each call generates a new temporary key
- WebSocket URL used to establish real-time transcription connection

---

## GET /api/releases/latest

Get latest desktop app release information.

**Access**: Public

**Response** (`200`):
```json
{
  "version": "0.1.0",
  "downloadUrl": "https://github.com/teu-im/releases/download/v0.1.0/app.dmg",
  "releaseDate": "2024-01-15",
  "releaseNotes": "Initial release"
}
```

**Errors**:
- `404` - No releases available
- `500` - Internal error

---

## POST /api/search

Search sessions and interpretations.

**Access**: Authenticated users only

**Request**:
```json
{
  "query": "search terms",
  "limit": 20,
  "offset": 0
}
```

**Response** (`200`):
```json
{
  "results": [
    {
      "type": "session",
      "session_id": "sess-456",
      "project_id": "proj-123",
      "project_name": "Q4 Conference 2024",
      "started_at": "2024-01-15T12:00:00Z"
    }
  ],
  "total": 42
}
```

**Errors**:
- `400` - Invalid query parameters
- `401` - Unauthorized
- `500` - Search failed

---

## GET /api/projects/[id]/analytics

Get analytics data for a project.

**Access**: Project owner only

**Parameters**:
- `id` - Project UUID

**Query Parameters**:
- `start_date` - YYYY-MM-DD format
- `end_date` - YYYY-MM-DD format
- `language` - Filter by language

**Response** (`200`):
```json
{
  "project_id": "proj-123",
  "total_sessions": 42,
  "total_interpretations": 1523,
  "languages": [
    {
      "code": "en",
      "name": "English",
      "count": 756
    }
  ],
  "timeline": [
    {
      "date": "2024-01-15",
      "sessions": 5,
      "interpretations": 182
    }
  ]
}
```

**Errors**:
- `400` - Invalid date format
- `401` - Unauthorized
- `404` - Project not found
- `500` - Analytics query failed

---

## GET /api/projects/[id]/analytics/summary

Get summary analytics for a project.

**Access**: Project owner only

**Parameters**:
- `id` - Project UUID

**Response** (`200`):
```json
{
  "project_id": "proj-123",
  "total_sessions": 42,
  "avg_session_duration_ms": 1800000,
  "total_interpretations": 1523,
  "top_languages": ["en", "ja", "zh"],
  "last_session_at": "2024-01-15T12:30:00Z"
}
```

**Errors**:
- `401` - Unauthorized
- `404` - Project not found
- `500` - Query failed

---

## POST /api/log

Log errors from client applications.

**Access**: Public

**Request**:
```json
{
  "level": "error",
  "message": "Something went wrong",
  "context": {
    "url": "/dashboard/projects",
    "userAgent": "Mozilla/5.0..."
  }
}
```

**Response** (`201`):
```json
{
  "success": true,
  "logId": "log-12345"
}
```

**Errors**:
- `400` - Invalid log data
- `500` - Logging failed

---

## POST /api/settings/soniox-key

Update user's Soniox API key.

**Access**: Authenticated users only

**Request**:
```json
{
  "apiKey": "sk-..."
}
```

**Response** (`200`):
```json
{
  "success": true,
  "message": "Soniox API 키가 저장되었습니다"
}
```

**Errors**:
- `400` - Invalid API key format
- `401` - Unauthorized
- `500` - Update failed

---

# CORS and Security

## CORS Headers

All endpoints return these headers:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, x-audience-token
```

## Rate Limiting

**Endpoint-specific limits**:
- `/api/audience/token` - 5 requests per minute per IP
- `/api/join` - 5 requests per minute per project code (password path)
- `/api/auth/signup` - 10 requests per hour per IP

**Headers**:
```
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1705324200
```

## Authentication Methods

1. **Session Cookie** (Web)
   - Automatically managed by Supabase
   - Set during login
   - Validated by middleware

2. **Bearer Token** (API/Desktop)
   - Header: `Authorization: Bearer <token>`
   - Obtained via login endpoint
   - Used in Soniox temp key endpoint

3. **Audience Token** (Attendees)
   - Header: `x-audience-token: <token>`
   - Short-lived (15 minutes)
   - Obtained via `/api/audience/token`

## Ownership Verification

All user-specific operations verify ownership:
```typescript
// Example: Only users who own the project can access it
const { data: project } = await supabase
  .from('projects')
  .select('id')
  .eq('id', projectId)
  .eq('user_id', user.id)  // ← Ownership check
  .single();
```

---

# Error Messages Reference

Common error messages returned by the API (all in Korean):

| Error | Message |
|-------|---------|
| UNAUTHORIZED | 인증이 필요합니다 |
| FORBIDDEN | 권한이 없습니다 |
| NOT_FOUND | 요청된 리소스를 찾을 수 없습니다 |
| VALIDATION | 요청 데이터가 유효하지 않습니다 |
| RATE_LIMITED | 요청 횟수를 초과했습니다. 잠시 후 다시 시도해주세요 |
| INTERNAL | 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요 |
| DUPLICATE | 중복된 리소스입니다 |
| CONFLICT | 현재 상태와 충돌합니다 |

---

# Language Codes

Supported language codes for projects:

```
ko  - Korean
en  - English
ja  - Japanese
zh  - Chinese
es  - Spanish
fr  - French
de  - German
it  - Italian
pt  - Portuguese
ru  - Russian
ar  - Arabic
hi  - Hindi
th  - Thai
vi  - Vietnamese
id  - Indonesian
ms  - Malay
ca  - Catalan
da  - Danish
el  - Greek
he  - Hebrew
hu  - Hungarian
lt  - Lithuanian
nl  - Dutch
no  - Norwegian
pl  - Polish
ro  - Romanian
sv  - Swedish
tr  - Turkish
uk  - Ukrainian
```

---

# Examples

## Creating a Project and Starting a Session

```bash
# 1. Create a project
curl -X POST https://your-domain.com/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Q4 Conference",
    "sourceLanguage": "ko",
    "targetLanguages": ["en", "ja"]
  }'

# Response:
# {
#   "project": {
#     "id": "proj-123",
#     "code": "CONF24",
#     "password": "AB12",
#     ...
#   }
# }

# 2. Start a session
curl -X POST https://your-domain.com/api/projects/proj-123/sessions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d {}

# Response:
# {
#   "session": {
#     "id": "sess-456",
#     "status": "active",
#     ...
#   }
# }
```

## Attendee Joining a Project

```bash
# 1. Get access token
curl -X POST https://your-domain.com/api/audience/token \
  -H "Content-Type: application/json" \
  -d '{
    "code": "CONF24",
    "password": "AB12"
  }'

# Response:
# {
#   "token": "eyJ...",
#   "projectId": "proj-123",
#   "sessionId": "sess-456",
#   "expiresAt": "..."
# }

# 2. Use token to join project
curl -X POST https://your-domain.com/api/join \
  -H "Content-Type: application/json" \
  -H "x-audience-token: eyJ..." \
  -d {}

# Response:
# {
#   "projectId": "proj-123",
#   "projectName": "Q4 Conference",
#   "sourceLanguage": "ko",
#   "targetLanguage": "en",
#   "sessionId": "sess-456"
# }
```

## Fetching Session Interpretation History

```bash
# Get first page of interpretations
curl https://your-domain.com/api/sessions/sess-456/history?limit=50 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response includes pagination data:
# {
#   "interpretations": [...],
#   "pagination": {
#     "next_cursor": "eyJzZXF1ZW5jZSI6NTAsImlkIjoiaW50ZXJwLWFiYzEyMyJ9",
#     "has_more": true,
#     "count": 50,
#     "total": 324
#   }
# }

# Get next page using cursor
curl 'https://your-domain.com/api/sessions/sess-456/history?limit=50&cursor=eyJzZXF1ZW5jZSI6NTAsImlkIjoiaW50ZXJwLWFiYzEyMyJ9' \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

# Troubleshooting

## 401 Unauthorized

- Missing `Authorization` header
- Invalid or expired token
- Session cookie expired
- Token not in correct format

## 404 Not Found

- Invalid resource ID
- Resource deleted
- User doesn't own the resource (intentionally returns 404 for security)

## 409 Conflict

- Trying to start a session when one is already active
- Duplicate audio chunk index
- Invalid state transition for session status

## 429 Rate Limited

- Too many requests from same IP or project code
- Wait until `X-RateLimit-Reset` time
- Implement exponential backoff in client

## 500 Internal Server Error

- Check server logs
- Ensure all environment variables are set
- Verify Supabase connectivity
- For Soniox endpoints, check API key is valid

---

# Changelog

## v1.0.0 (Current)
- Initial API documentation
- Full endpoint reference
- Pagination and filtering examples
