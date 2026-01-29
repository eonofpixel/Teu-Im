# Audience Loading Fix - Learnings

## Problem
Users experienced infinite loading when accessing `/audience/{code}?p={password}` or `/audience/{code}?t={token}` due to:
1. No timeout handling on API calls
2. No retry mechanism
3. No user feedback for slow connections

## Solution Implemented

### 1. Request Timeout (10 seconds)
- Added `AbortController` to both token and password validation flows
- If request takes more than 10 seconds, abort and show error
- User sees clear timeout message: "연결 시간이 초과되었습니다. 다시 시도해주세요."

### 2. Slow Loading Indicator (5 seconds)
- Shows "연결이 지연되고 있습니다..." after 5 seconds of waiting
- Provides user feedback during slow network conditions
- Appears both in:
  - URL-based auto-validation loading screen
  - PasswordGate form submit button

### 3. Proper Cleanup
- All timers are cleared on success, error, or abort
- Prevents memory leaks and race conditions

## Technical Pattern

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);
const slowLoadingTimer = setTimeout(() => setShowSlowLoading(true), 5000);

try {
  const res = await fetch("/api/join", {
    signal: controller.signal,
    // ... other options
  });
  clearTimeout(timeoutId);
  clearTimeout(slowLoadingTimer);
  // ... handle response
} catch (err) {
  clearTimeout(timeoutId);
  clearTimeout(slowLoadingTimer);

  if ((err as Error).name === 'AbortError') {
    // Timeout-specific error message
  } else {
    // Generic error message
  }
}
```

## Files Modified
- `/apps/web/app/audience/[code]/page.tsx`
  - Token validation useEffect (lines 698-762)
  - Password validation useEffect (lines 765-817)
  - PasswordGate component handleSubmit (lines 89-136)
  - Loading screen UI (lines 825-847)
  - Submit button UI (lines 167-201)

## User Experience Improvements
1. No more infinite loading - timeout after 10 seconds
2. Better feedback - shows delay message after 5 seconds
3. Clear error messages - distinguishes timeout from other errors
4. Automatic fallback - timeout errors suggest retry with password gate
