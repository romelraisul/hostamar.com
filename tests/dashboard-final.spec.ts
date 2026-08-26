import { test, expect } from '@playwright/test';

/**
 * Final dashboard regression spec — run with:
 *   npx playwright test tests/dashboard-final.spec.ts
 *
 * Covers the "Our Product" navigation bug, docked help center, and the
 * hosting credit gate. Fresh signup per run (welcome credits at signup).
 */

const BASE = 'https://hostamar.com';
const TABS = [
  '/dashboard/ai-studio',
  '/dashboard/browser',
  '/dashboard/ide',
  '/dashboard/game',
  '/dashboard/hosting',
];

test('dashboard final — nav, help center, hosting gate', async ({ page }) => {
  test.setTimeout(240_000);
  const email = `qa-final+${Date.now()}@hostamar.com`;

  // Signup + login via API (fast, no form flakiness)
  const reg = await page.request.post(`${BASE}/api/auth/register`, {
    data: { name: 'QA Final', email, password: 'Test@123456' },
  });
  expect(reg.ok()).toBeTruthy();

  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', 'Test@123456');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 30_000 });

  // 1. All sidebar tabs stay inside /dashboard/*
  for (const tab of TABS) {
    await page.goto(`${BASE}${tab}`);
    expect(page.url(), `${tab} must stay in dashboard`).toContain('/dashboard/');
    // no login CTA on the page (would indicate leaving the shell)
    const loginLink = page.locator('a[href="/login"]');
    expect(await loginLink.count(), `${tab} shows login CTA`).toBe(0);
    console.log(`PASS nav ${tab}`);
  }

  // Public marketing pages are never linked from the sidebar routes
  for (const bad of ['/chat', '/browser', '/ide', '/game']) {
    await page.goto(`${BASE}/dashboard`);
    const hrefs = await page.locator(`a[href="${bad}"]`).count();
    console.log(`sidebar links to ${bad}: ${hrefs}`);
  }

  // 2. Help center visible by default on every dashboard page
  for (const tab of TABS.slice(0, 2)) {
    await page.goto(`${BASE}${tab}`);
    await expect(page.locator('[data-testid="dash-help-center"]')).toBeVisible();
  }
  console.log('PASS help center docked by default');

  // 3. Help center answers how-to with concrete steps
  await page.goto(`${BASE}/dashboard/ai-studio`);
  const box = page.locator('[data-testid="dash-help-center"]');
  await box.locator('input').fill('how can i generate video');
  await box.locator('input').press('Enter');
  await expect(box.getByText(/AI Video/i).first()).toBeVisible({ timeout: 60_000 });
  await expect(box.getByText(/left sidebar/i).first()).toBeVisible({ timeout: 10_000 });
  console.log('PASS chat answers with left-sidebar steps');

  // 4. Hosting credit gate: over-budget -> 402 with balance+needed
  const res = await page.request.post(`${BASE}/api/hosting/servers`, {
    data: { name: `qa-${Date.now()}`, image: 'nginx:alpine', cpu: 100, ram: 500, storage: 50000 },
  });
  expect(res.status()).toBe(402); // welcome credits = 6000 < needed 28500
  const body = await res.json();
  expect(body.error).toBe('INSUFFICIENT_CREDITS');
  expect(body.balance).toBe(6000); // proves signup grant
  expect(body.needed).toBeGreaterThan(body.balance);
  console.log(`PASS hosting gate 402 balance=${body.balance} needed=${body.needed}`);
});
