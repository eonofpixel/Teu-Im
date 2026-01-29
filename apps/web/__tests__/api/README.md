# API Integration Tests

This directory contains integration tests for public API utilities in the Teu-Im web app.

## Test Files

### `api-response.test.ts` (17 tests)
Tests for standardized API response helpers from `lib/api-response.ts`:

**apiSuccess tests (7 tests):**
- Default status 200
- JSON response body with data
- Cache-Control headers (no-store by default)
- Public cache with TTL when specified
- CORS headers for cross-origin requests
- Custom status codes
- Rate limit headers

**apiError tests (8 tests):**
- Default status 500
- Error message in response body
- Custom status codes
- Cache-Control headers (no-store)
- CORS headers
- Rate limit headers
- Error details excluded in production
- Error details included in development

**ERRORS constants tests (2 tests):**
- Korean error messages
- All expected error keys present

### `release-helpers.test.ts` (22 tests)
Tests for GitHub release API helper functions from `app/api/releases/latest/route.ts`:

**detectPlatform tests (9 tests):**
- Detects macOS ARM from aarch64 DMG
- Detects macOS ARM from darwin aarch64
- Detects macOS ARM from macos aarch64
- Detects Windows from .exe
- Detects Windows from setup.exe
- Returns null for non-ARM macOS
- Returns null for Linux binaries
- Returns null for source archives
- Case-insensitive matching

**isDownloadable tests (6 tests):**
- Accepts .dmg files
- Accepts .exe files
- Rejects source code archives
- Rejects files without valid extensions
- Rejects .msi files
- Case-insensitive matching

**parseChecksums tests (7 tests):**
- Parses valid checksums.txt format
- Handles empty lines gracefully
- Requires exactly 64 hex characters
- Requires two spaces between hash and filename
- Handles uppercase hex characters
- Returns empty map for empty input
- Handles filenames with spaces

## Running Tests

```bash
# Run all API tests
npm test -- __tests__/api/

# Run specific test file
npm test -- __tests__/api/api-response.test.ts
npm test -- __tests__/api/release-helpers.test.ts

# Watch mode
npm test:watch -- __tests__/api/
```

## Test Coverage

Total: **39 integration tests** covering:
- API response utilities (17 tests)
- Release API helpers (22 tests)

All tests use minimal mocking and test actual utility functions.
