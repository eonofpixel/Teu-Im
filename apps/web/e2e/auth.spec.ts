import { test, expect } from '@playwright/test';

test.describe('Authentication Pages', () => {
  test('should load login page successfully', async ({ page }) => {
    await page.goto('/login');

    // Check page title and branding
    await expect(page.getByRole('heading', { name: 'Teu-Im' })).toBeVisible();
    await expect(page.getByText('실시간 AI 통역 플랫폼')).toBeVisible();

    // Check login form elements
    await expect(page.getByRole('heading', { name: '계정에 로그인' })).toBeVisible();
    await expect(page.getByLabel('이메일')).toBeVisible();
    await expect(page.getByLabel('비밀번호')).toBeVisible();
    await expect(page.getByRole('button', { name: '로그인' })).toBeVisible();
  });

  test('should have working signup link on login page', async ({ page }) => {
    await page.goto('/login');

    // Find and click signup link
    const signupLink = page.getByRole('link', { name: '회원가입' });
    await expect(signupLink).toBeVisible();

    // Click and verify navigation
    await signupLink.click();
    await expect(page).toHaveURL('/signup');
  });

  test('should load signup page successfully', async ({ page }) => {
    await page.goto('/signup');

    // Check page branding
    await expect(page.getByRole('heading', { name: 'Teu-Im' })).toBeVisible();

    // Check signup form exists
    await expect(page.getByRole('button', { name: /가입|회원가입/ })).toBeVisible();
  });

  test('should have working login link on signup page', async ({ page }) => {
    await page.goto('/signup');

    // Find login link (should be in text like "이미 계정이 있으신가요?")
    const loginLink = page.getByRole('link', { name: /로그인/ });
    await expect(loginLink).toBeVisible();

    // Click and verify navigation
    await loginLink.click();
    await expect(page).toHaveURL('/login');
  });

  test('should show validation for empty login form', async ({ page }) => {
    await page.goto('/login');

    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: '로그인' });
    await submitButton.click();

    // HTML5 validation should prevent submission (email field is required)
    // Check that we're still on login page
    await expect(page).toHaveURL('/login');
  });
});
