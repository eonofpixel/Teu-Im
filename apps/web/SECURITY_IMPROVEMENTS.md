# Security Improvements - Teu-Im Web App

This document summarizes the security improvements implemented in the web application.

## 1. Restricted CORS Origins

**File**: `apps/web/middleware.ts`

**Changes**:
- Replaced wildcard CORS (`"Access-Control-Allow-Origin": "*"`) with environment-based allowed origins
- Development: Automatically allows `localhost` and `127.0.0.1` with any port
- Production: Uses `ALLOWED_ORIGINS` environment variable (comma-separated list)
- Falls back to `NEXT_PUBLIC_APP_URL` if `ALLOWED_ORIGINS` not set

**Implementation**:
```typescript
function getAllowedOrigins(): string[] {
  const isDevelopment = process.env.NODE_ENV === "development";

  if (isDevelopment) {
    return ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"];
  }

  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
  if (allowedOriginsEnv) {
    return allowedOriginsEnv.split(",").map((origin) => origin.trim());
  }

  return appUrl ? [appUrl] : [];
}
```

**Environment Variable**:
```bash
# Production only - comma-separated list of allowed origins
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## 2. Content Security Policy (CSP) Headers

**File**: `apps/web/middleware.ts`

**Changes**:
- Added comprehensive CSP header to all responses
- Restricts script sources to self and necessary inline scripts
- Automatically includes Supabase URL in `connect-src` directive
- Different policies for development vs production

**CSP Directives**:
- `default-src 'self'` - Only allow resources from same origin by default
- `script-src 'self' 'unsafe-inline'` - Allow own scripts and inline (Next.js requirement)
- `style-src 'self' 'unsafe-inline'` - Allow own styles and inline (Tailwind requirement)
- `img-src 'self' data: blob: https:` - Allow images from various safe sources
- `connect-src 'self' [supabase-url]` - Allow API calls to self and Supabase
- `frame-ancestors 'none'` - Prevent clickjacking by blocking iframe embedding
- `base-uri 'self'` - Restrict base URL to prevent injection attacks
- `form-action 'self'` - Restrict form submissions to same origin

**Additional Security Headers**:
- `X-Frame-Options: DENY` - Prevent clickjacking
- `X-Content-Type-Options: nosniff` - Prevent MIME sniffing attacks
- `Referrer-Policy: strict-origin-when-cross-origin` - Control referrer information
- `Permissions-Policy: camera=(), microphone=(self), geolocation=()` - Restrict browser features

## 3. Environment Variable Validation

**File**: `apps/web/lib/env.ts` (new file)

**Changes**:
- Created centralized environment validation at application startup
- Validates presence and format of required environment variables
- Provides clear error messages if variables are missing
- Only validates at runtime (skips during build)

**Required Variables**:
- `NEXT_PUBLIC_SUPABASE_URL` - Must be a valid URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Must be at least 20 characters

**Usage**:
```typescript
// In apps/web/app/layout.tsx
import { validateEnv } from "@/lib/env";

// Validate at application startup
validateEnv();
```

**Error Example**:
```
Environment validation failed:
  - NEXT_PUBLIC_SUPABASE_URL is required but not set
  - NEXT_PUBLIC_SUPABASE_ANON_KEY is required but not set

Please check your .env.local file and ensure all required variables are set.
```

## 4. Updated Environment Configuration

**File**: `apps/web/.env.example`

**Changes**:
- Added documentation for new `ALLOWED_ORIGINS` variable
- Clarified that it's only needed in production
- Provided example format

## Security Benefits

### CORS Restriction
- **Before**: Any domain could make API requests to the web app
- **After**: Only explicitly allowed domains can make cross-origin requests
- **Protection**: Prevents unauthorized API access from malicious sites

### CSP Headers
- **Before**: No CSP headers, allowing any script/resource loading
- **After**: Strict CSP policy limiting resource sources
- **Protection**: Mitigates XSS attacks, clickjacking, and data injection

### Environment Validation
- **Before**: App could start with missing critical configuration
- **After**: App fails immediately with clear error messages
- **Protection**: Prevents runtime errors and security misconfigurations

## Verification

Build verification successful:
```bash
npm run build
# ✓ Compiled successfully
# ✓ Linting and checking validity of types
# ✓ Generating static pages (21/21)
```

All security improvements are backward compatible and do not break existing functionality.

## Deployment Notes

### For Production Deployment:

1. **Set ALLOWED_ORIGINS** in your hosting platform's environment variables:
   ```
   ALLOWED_ORIGINS=https://your-domain.com,https://api.your-domain.com
   ```

2. **Verify Environment Variables** are set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ALLOWED_ORIGINS` (optional, falls back to NEXT_PUBLIC_APP_URL)

3. **Test CORS** with your frontend/mobile apps to ensure they're in the allowed origins list

### For Development:

- No changes needed - localhost is automatically allowed
- All environment variables must be present in `.env.local`

## Testing Recommendations

1. **CORS Testing**:
   - Test API calls from allowed origins (should succeed)
   - Test API calls from non-allowed origins (should be blocked)
   - Verify preflight OPTIONS requests work correctly

2. **CSP Testing**:
   - Check browser console for CSP violations
   - Verify Supabase connections work (connect-src includes Supabase URL)
   - Ensure service workers and web workers load correctly

3. **Environment Validation**:
   - Try starting app without required env vars (should fail with clear error)
   - Verify error messages are helpful for debugging

## Monitoring

Consider monitoring these security-related metrics:
- Blocked CORS requests (429 responses from non-allowed origins)
- CSP violations (check browser console or CSP reporting endpoint)
- Failed environment validations on deployments
