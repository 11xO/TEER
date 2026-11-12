import { expect, test } from '@playwright/test';
import { fixtureData, setup, user } from './fixture.js';

test('an approval login cannot restore a session after rejection and returning to registration', async ({ page }) => {
  const data = fixtureData();
  data.primary.pending_registrations = { pending: { ...user, status: 'pending', requestedAt: Date.now(), inviteCode: '' } };
  await setup(page, { loggedIn: false, data });
  await page.evaluate(() => localStorage.setItem('pending_registration_id', 'pending'));
  await page.reload();
  await page.locator('.splash').waitFor({ state: 'detached' });
  await page.evaluate(async () => { window.__delayProfileRead = true; await window.__fixture.patch('pending_registrations/pending', { status: 'approved' }); });
  await expect.poll(() => page.evaluate(() => typeof window.__releaseProfileRead)).toBe('function');
  await page.evaluate(() => window.__fixture.patch('pending_registrations/pending', { status: 'rejected', rejectReason: 'راجع بياناتك' }));
  await page.getByRole('button', { name: 'حاول تاني' }).click();
  await page.evaluate(async () => { window.__releaseProfileRead(); await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))); });
  await expect(page.getByLabel('اسمك الكامل')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('user_phone'))).toBeNull();
  await expect(page.locator('#appSection')).toHaveCount(0);
});
