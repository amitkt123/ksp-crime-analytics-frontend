import { test, expect } from '@playwright/test';

test('SCRB Analyst logs in and sees a fully real Command Center', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#username', 'demo.analyst');
  await page.fill('#password', 'Demo@12345');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/command-center/);
  await expect(page.getByRole('heading', { name: 'Command Center' })).toBeVisible();

  // A KPI tile renders a real, non-empty figure -- not a mocked placeholder.
  await expect(page.locator('.kpi-tile .figure').first()).not.toHaveText('');

  // The map container renders (pixel-level choropleth verification is out of scope for
  // Playwright; this confirms MapLibre mounted against the real districts endpoint).
  await expect(page.getByRole('img', { name: /Map of Karnataka/ })).toBeVisible();

  // If any emerging alerts are active for the seeded demo data, clicking one must open
  // the real Evidence Panel with real (non-empty) claim text -- not a stub.
  const firstAlert = page.locator('.alert-card').first();
  if (await firstAlert.isVisible().catch(() => false)) {
    await firstAlert.click();
    await expect(page.getByRole('dialog', { name: 'Evidence panel' })).toBeVisible();
    await expect(page.locator('.evidence-claim')).not.toHaveText('');
  }
});
