# End-to-End Tests

This directory contains Playwright end-to-end tests for the Teu-Im web application.

## Running Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run tests in UI mode (interactive)
pnpm exec playwright test --ui

# Run tests in headed mode (see browser)
pnpm exec playwright test --headed

# Run specific test file
pnpm exec playwright test e2e/auth.spec.ts

# Run with debug mode
pnpm exec playwright test --debug
```

## Test Structure

### `auth.spec.ts`
Tests authentication-related functionality:
- Login page loads correctly
- Signup page loads correctly
- Navigation between login and signup pages works
- Form validation works

### `navigation.spec.ts`
Tests navigation and route protection:
- Protected routes redirect to login when unauthenticated
- Public routes (landing page, audience page) are accessible
- Dashboard, analytics, settings, live, and download pages require authentication

## Configuration

The Playwright configuration is in `playwright.config.ts`:
- Tests run against `localhost:3000`
- Uses Chromium browser only (for simplicity)
- Automatically starts the Next.js dev server before tests
- Includes test environment variables for Supabase (dummy values for testing)

## Notes

- Tests use dummy Supabase credentials configured in `playwright.config.ts`
- Tests do NOT cover authenticated flows (no test user credentials)
- Tests verify page loading and basic navigation only
- For authenticated flow testing, add test user credentials to environment variables

## CI/CD

E2E tests run automatically on GitHub Actions after unit tests pass.
See `.github/workflows/ci.yml` for the CI configuration.
