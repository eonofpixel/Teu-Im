import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation', () => {
  test('should redirect to login when accessing dashboard unauthenticated', async ({ page }) => {
    // Try to access protected dashboard route
    await page.goto('/projects');

    // Should be redirected to login
    await expect(page).toHaveURL('/login');
  });

  test('should redirect to login when accessing live session page unauthenticated', async ({ page }) => {
    await page.goto('/live');

    // Should be redirected to login
    await expect(page).toHaveURL('/login');
  });

  test('should redirect to login when accessing analytics unauthenticated', async ({ page }) => {
    await page.goto('/analytics');

    // Should be redirected to login
    await expect(page).toHaveURL('/login');
  });

  test('should redirect to login when accessing settings unauthenticated', async ({ page }) => {
    await page.goto('/settings');

    // Should be redirected to login
    await expect(page).toHaveURL('/login');
  });

  test('should redirect to login when accessing download page unauthenticated', async ({ page }) => {
    await page.goto('/download');

    // Should be redirected to login
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Landing Page', () => {
  test('should load landing page successfully', async ({ page }) => {
    await page.goto('/');

    // Page should load without errors
    await expect(page).toHaveURL('/');

    // Check that page has loaded (look for common HTML elements)
    const html = await page.content();
    expect(html).toContain('<html');
  });
});

test.describe('Public Audience Page', () => {
  test('should load audience join page', async ({ page }) => {
    // Navigate to audience page (public route)
    await page.goto('/audience');

    // Page should load (exact content depends on implementation)
    await expect(page).toHaveURL('/audience');
  });
});
