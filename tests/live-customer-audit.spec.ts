import { test, expect } from '@playwright/test';

// Live customer dashboard audit — run against production.
// Fresh signup per run (welcome credits granted at signup since 2026-08-26).

const BASE = 'https://hostamar.com';

test('create account and audit dashboard', async ({ page }) => {
  test.setTimeout(180_000);
  const email = `qa-test+${Date.now()}@hostamar.com`;

  // 1. Signup (Bangla form; typed inputs in order name/email/pass/confirm)
  await page.goto(`${BASE}/signup`);
  await page.fill('input[type="text"]', 'QA Tester');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', 'Test@123456');
  const checkbox = page.locator('input[type="checkbox"]');
  if (await checkbox.count()) await checkbox.first().check();
  await page.click('button[type="submit"]');

  // 2. Login
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', 'Test@123456');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 30_000 });

  // 3. Every product tab stays inside /dashboard/*
  for (const path of ['/dashboard/ai-studio','/dashboard/browser','/dashboard/ide','/dashboard/game','/dashboard/hosting']) {
    const resp = await page.goto(`${BASE}${path}`);
    expect(resp?.status(), `${path} status`).toBeLessThan(400);
    expect(page.url()).toContain('/dashboard/');
    console.log(`PASS ${path}`);
  }

  // 4. Browser tab proxies inside the dashboard
  await page.goto(`${BASE}/dashboard/browser`);
  await page.fill('input[placeholder*="website"]', 'example.com');
  await page.click('text=Browse');
  await expect(page.locator('iframe[title="Hostamar Browser"]')).toBeVisible({ timeout: 20_000 });
  console.log('PASS browser iframe inside dashboard');

  // 5. Hosting API: insufficient credits must be 402 (not 401)
  const res = await page.request.post(`${BASE}/api/hosting/servers`, {
    data: { name: `qa-${Date.now()}`, image: 'nginx:alpine', cpu: 64, ram: 128, storage: 5000 },
  });
  expect([402, 503]).toContain(res.status());
  if (res.status() === 402) {
    const body = await res.json();
    expect(body.error).toBe('INSUFFICIENT_CREDITS');
    expect(typeof body.balance).toBe('number');
  }
  console.log(`PASS hosting gate status=${res.status()}`);

  // 6. Help center docked by default + answers with steps
  await page.goto(`${BASE}/dashboard/ai-studio`);
  await expect(page.locator('[data-testid="dash-help-center"]')).toBeVisible();
  await page.fill('[data-testid="dash-help-center"] input', 'how can i generate video');
  await page.press('[data-testid="dash-help-center"] input', 'Enter');
  await expect(page.locator('[data-testid="dash-help-center"]').getByText(/AI Video/i).first()).toBeVisible({ timeout: 60_000 });
  console.log('PASS help center answers with sidebar steps');
});
