# Desktop Auth Persistence - Learnings

## Implementation Summary

Successfully implemented auth persistence for the desktop app with three key components:

### 1. Zustand Persist Middleware
- Added `persist` middleware to `appStore.ts`
- Storage: localStorage
- Partial persistence: Only user and currentProject are persisted
- Transient states (recording, streaming, soniox connection) are NOT persisted
- Storage key: `teu-im-desktop-storage`

### 2. Supabase Auth State Listener
- Created `useAuthInit` hook in `src/hooks/useAuthInit.ts`
- Listens for Supabase auth state changes:
  - SIGNED_IN: Updates user in store
  - TOKEN_REFRESHED: Updates user in store
  - SIGNED_OUT: Resets all app state
  - USER_UPDATED: Updates user in store
- Prevents double initialization with ref check (StrictMode)

### 3. Session Restoration on App Startup
- `useAuthInit` checks for existing session via `supabase.auth.getSession()`
- Runs once on app mount
- If valid session exists, restores user to store
- If no session or error, sets user to null

### 4. Proper Logout Flow
- Updated ProjectSelect to call `supabase.auth.signOut()`
- Auth state listener automatically triggers reset
- All app state cleared on sign out

## Key Files Modified
- `/apps/desktop/src/stores/appStore.ts` - Added persist middleware
- `/apps/desktop/src/hooks/useAuthInit.ts` - New auth initialization hook
- `/apps/desktop/src/App.tsx` - Integrated useAuthInit hook
- `/apps/desktop/src/pages/ProjectSelect.tsx` - Updated logout handler
- `/apps/desktop/src/lib/supabase.ts` - Already had persistSession: true

## Supabase Client Config
The Supabase client already had proper config:
```typescript
{
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
}
```

This enables automatic storage of session in localStorage (key: `sb-<project-id>-auth-token`) and automatic token refresh.

## Flow Diagram

```
App Startup
  ├─> useAuthInit hook initializes
  ├─> Check supabase.auth.getSession()
  │   ├─> If session exists → Set user in store
  │   └─> If no session → Set user to null
  ├─> Subscribe to onAuthStateChange
  └─> Show appropriate view (Login/ProjectSelect/Interpreter)

User Login
  ├─> Call signInWithEmail()
  ├─> Supabase stores session in localStorage
  ├─> onAuthStateChange fires with SIGNED_IN
  ├─> Hook updates store with user
  └─> Zustand persist saves user to localStorage

User Logout
  ├─> Call supabase.auth.signOut()
  ├─> Supabase clears session from localStorage
  ├─> onAuthStateChange fires with SIGNED_OUT
  ├─> Hook calls reset() to clear all state
  └─> Zustand persist clears stored user

App Restart
  ├─> Zustand hydrates store from localStorage (user + currentProject)
  ├─> useAuthInit checks Supabase session
  ├─> If tokens still valid → User stays logged in
  └─> If tokens expired → User set to null, shown login screen
```

## Testing Checklist
- [x] Type checking passes
- [ ] Manual test: Login, close app, reopen → should stay logged in
- [ ] Manual test: Logout → should clear all state
- [ ] Manual test: Token expiry → should redirect to login
- [ ] Manual test: Multiple sessions → should sync across tabs (if applicable)

## Notes
- Supabase handles token storage and refresh automatically
- Zustand persist handles app-level state (user object, current project)
- The two systems work together for complete auth persistence
- Session timeout is controlled by Supabase project settings (default: 7 days)
