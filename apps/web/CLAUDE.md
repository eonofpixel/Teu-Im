# Web App Architecture

This document describes the architecture, structure, and key patterns used in the Teu-Im web application.

## Overview

The web app is a Next.js 15 application that serves as the management dashboard for Teu-Im. It provides organizers with tools to create projects, start live interpretation sessions, monitor real-time transcription, view analytics, and export session data.

**Tech Stack**:
- Next.js 15 (App Router)
- React 19 (Server Components by default)
- TypeScript for type safety
- Tailwind CSS 4 for styling
- Supabase for authentication and database
- Zustand for client-side state management (desktop app)

## Directory Structure

```
apps/web/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout with global providers
│   ├── page.tsx                 # Landing page
│   ├── (auth)/                  # Auth routes (login, signup)
│   ├── (dashboard)/             # Protected dashboard routes
│   │   ├── layout.tsx          # Dashboard layout with nav
│   │   ├── projects/           # Project management pages
│   │   ├── sessions/           # Session history and playback
│   │   ├── analytics/          # Global analytics dashboard
│   │   ├── live/               # Live session monitoring
│   │   └── settings/           # User settings
│   ├── api/                     # REST API routes
│   │   ├── auth/               # Authentication endpoints
│   │   ├── projects/           # Project CRUD endpoints
│   │   ├── sessions/           # Session management endpoints
│   │   ├── audience/           # Attendee token generation
│   │   ├── audio/              # Audio chunk handling
│   │   └── ...                 # Other utility endpoints
│   └── audience/               # Public attendee join page
├── components/                  # Reusable React components
│   ├── error-boundary.tsx      # Error boundary for graceful error handling
│   ├── loading-skeleton.tsx    # Reusable loading skeleton
│   ├── analytics/              # Analytics dashboard components
│   └── ...                     # Feature-specific components
├── lib/                        # Utility functions and helpers
│   ├── supabase/              # Supabase client configuration
│   │   ├── server.ts          # Server-side Supabase client
│   │   ├── browser.ts         # Browser-side Supabase client
│   │   ├── client.ts          # Shared client setup
│   │   └── middleware.ts      # Middleware for auth
│   ├── api-response.ts        # Standardized API response helpers
│   ├── validation.ts          # Input validation utilities
│   ├── audience-token.ts      # Token generation and verification
│   ├── rate-limit.ts          # Rate limiting implementation
│   ├── logger.ts              # Error logging utilities
│   ├── error-tracking.ts      # Error tracking integration
│   ├── soniox.ts              # Soniox API integration
│   ├── srt.ts                 # SRT subtitle format utilities
│   └── env.ts                 # Environment variable schema
├── middleware.ts              # Next.js middleware for auth protection
├── package.json
└── tsconfig.json
```

## Key Files and Their Purposes

### `lib/api-response.ts`
Provides standardized response helpers for all API routes:
- `apiSuccess(data, options)` - Successful response with optional caching
- `apiError(message, options)` - Error response with status codes
- `ERRORS` - Standardized Korean error messages

All responses include CORS headers for desktop app compatibility and consistent JSON envelope structure.

### `lib/validation.ts`
Input validation utilities for API route boundaries:
- `validateString()` - String with length constraints
- `validateEnum()` - Enum value validation
- `validateUUID()` - UUID format validation
- `validateCreateProject()` - Project creation payload validation
- `validateJoinProject()` - Project join credential validation
- Language code validation

Returns `{ valid: true, data }` or `{ valid: false, error }` for easy error handling.

### `lib/supabase/server.ts`
Creates server-side Supabase client with proper cookie handling for authentication. Used in all API routes and server components.

### `lib/supabase/browser.ts`
Creates browser-side Supabase client for real-time subscriptions and client-side queries. Used in client components.

### `lib/audience-token.ts`
Token generation and verification for attendee access:
- `generateToken(projectId, sessionId, expiresAt)` - Create signed JWT
- `verifyToken(token)` - Validate and decode JWT
- Prevents attendees from accessing other projects' data

### `lib/rate-limit.ts`
In-memory rate limiting implementation:
- IP-based rate limiting for auth endpoints
- Project-code-based rate limiting for join endpoint
- Configurable limits and time windows

### `middleware.ts`
Next.js middleware protecting dashboard routes:
- Redirects unauthenticated users to login
- Maintains session via Supabase cookies
- Runs on protected route patterns

## API Routes Structure

### Authentication Pattern

Every API route follows this pattern:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient as createClient } from '@/lib/supabase/server';
import { apiError, apiSuccess, ERRORS } from '@/lib/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const corsHeaders = { /* CORS configuration */ };

// OPTIONS - CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// GET/POST/PATCH/DELETE - Route handlers
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiError(ERRORS.UNAUTHORIZED, { status: 401 });
    }

    // Business logic...
    return apiSuccess({ data });
  } catch (error) {
    logError('GET /api/route', error as Error);
    return apiError(ERRORS.INTERNAL, { status: 500 });
  }
}
```

**Key Patterns**:
1. Use `createServerClient` to get authenticated user
2. Check authentication and permissions immediately
3. Use validation utilities for input
4. Return standardized responses via `apiSuccess` or `apiError`
5. Log errors for debugging
6. Include CORS headers for all responses

### Ownership Verification

For endpoints accessing user-owned resources:

```typescript
// Verify project ownership before accessing sessions
const { data: project } = await supabase
  .from('projects')
  .select('id')
  .eq('id', projectId)
  .eq('user_id', user.id)  // ← Ownership check
  .single();

if (!project) {
  return apiError(ERRORS.NOT_FOUND, { status: 404 });
}
```

This pattern ensures users can only access their own data.

## Client Components

### Error Boundary (`components/error-boundary.tsx`)

Catches React errors and displays user-friendly error UI:

```typescript
'use client';
import { ErrorBoundary as ErrorBoundaryComponent } from 'react-error-boundary';

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundaryComponent
      onError={(error) => console.error(error)}
      fallback={<ErrorFallback />}
    >
      {children}
    </ErrorBoundaryComponent>
  );
}
```

Usage: Wrap feature areas to contain errors and prevent full page crashes.

### Loading Skeleton (`components/loading-skeleton.tsx`)

Provides consistent loading state UI across the app. Used during initial data fetching.

## Important Patterns

### Server vs Client Components

**Server Components** (default in Next.js 15):
- Use for initial data fetching
- Access databases and APIs directly
- Cannot use browser APIs or event listeners
- Used for page layouts and static content

**Client Components** (marked with `'use client'`):
- Use for interactive features
- Handle form inputs and state
- Use browser APIs
- Use `useEffect` for side effects
- Components in `components/` directory

### Authentication Flow

1. User submits credentials via `/api/auth/signup` or login page
2. Supabase returns session cookie
3. Middleware validates cookie on protected routes
4. Server components access user via `supabase.auth.getUser()`

### Real-Time Updates

For live session monitoring, use Supabase real-time subscriptions:

```typescript
const channel = supabase
  .channel(`session-${sessionId}`)
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
    (payload) => {
      // Update UI when session changes
    }
  )
  .subscribe();

// Cleanup
return () => channel.unsubscribe();
```

### Error Handling

**In API Routes**: Use `apiError()` and `logError()` consistently
**In Client Components**: Show error UI via error boundaries or error pages
**In Server Components**: Use `error.tsx` pages for caught errors

## Testing Guidelines

### API Route Testing

Test API routes with:
- Valid authenticated requests
- Missing authentication
- Ownership violations
- Invalid input validation
- Rate limiting behavior
- CORS preflight requests

Example:
```typescript
describe('POST /api/projects', () => {
  it('creates a project for authenticated user', async () => {
    // Setup: Create user and get auth token
    // Call: POST /api/projects with project data
    // Assert: Response has status 201 with project data
  });

  it('rejects unauthenticated requests', async () => {
    // Call: POST /api/projects without auth
    // Assert: Response has status 401 with error message
  });
});
```

### Component Testing

Test components with:
- User interactions
- Loading states
- Error states
- Accessibility (ARIA labels, semantic HTML)

## Key Hooks

Look for these custom hooks in the codebase:
- `useProject()` - Fetch and manage project data
- `useSession()` - Manage live session state
- `useSessions()` - List sessions for a project
- `useAnalytics()` - Fetch analytics data

These typically handle loading, error, and data states.

## Middleware Configuration

Protected routes via middleware:
- `/(dashboard)/*` - All dashboard routes require authentication
- `/api/projects/*` - All project APIs require authentication
- `/api/sessions/*` - All session APIs require authentication

Public routes:
- `/` - Landing page
- `/(auth)/*` - Login and signup
- `/api/auth/signup` - User registration
- `/api/audience/*` - Attendee token generation
- `/api/join` - Project join endpoint

## Supabase Integration Notes

### Row Level Security (RLS)

Projects table RLS policy:
```sql
-- Users can only see their own projects
SELECT * FROM projects WHERE user_id = auth.uid();

-- Users can only modify their own projects
UPDATE projects SET ... WHERE user_id = auth.uid();
```

Sessions table RLS policy:
```sql
-- Users can see sessions for projects they own
SELECT sessions.* FROM sessions
JOIN projects ON sessions.project_id = projects.id
WHERE projects.user_id = auth.uid();
```

### Database Types

Import types from `@teu-im/supabase`:
```typescript
import type { Database } from '@teu-im/supabase';

type Project = Database['public']['Tables']['projects']['Row'];
type Session = Database['public']['Tables']['sessions']['Row'];
```

## Environment Variables

See root README.md for environment variable reference.

Additional web app specific:
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side operations (non-auth database access)
- `SONIOX_API_KEY` - Soniox speech-to-text service
- `NODE_ENV` - Environment detection (production hides error details)

## Common Gotchas

1. **Dynamic Route Parameters**: Use `const { id } = await params` (not destructure directly)
2. **CORS**: All API routes must export OPTIONS handler
3. **Authentication**: Always verify user exists after getting auth user
4. **Ownership**: Always check `user_id` matches for user-owned resources
5. **Rate Limiting**: Different limits for different endpoints
6. **Errors in Korean**: All error messages to clients are in Korean
7. **Cache Control**: Use `cacheTtl` parameter for public endpoints

## Performance Optimization

- Use `cacheTtl` option in `apiSuccess()` for cacheable endpoints
- Implement pagination for list endpoints (projects, sessions)
- Use database indexes on frequently queried fields
- Minimize bundle size by using code splitting in client components
- Use React Server Components by default to reduce JS sent to browser

## Troubleshooting

### Authentication Not Working
1. Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Verify middleware is configured for protected routes
3. Check Supabase RLS policies are enabled
4. Look for cookie errors in browser DevTools

### API Rate Limiting
- Check `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers
- Rate limits reset after window time elapses
- Different endpoints have different limits

### Real-Time Not Updating
- Verify Supabase real-time is enabled for that table
- Check `postgres_changes` filter syntax
- Ensure table has `updated_at` column for event detection

## Additional Resources

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Root README](../../README.md)
- [API Documentation](../../docs/API.md)
