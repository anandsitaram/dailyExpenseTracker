import { test, expect } from '@playwright/test';

// The app intentionally shows a first-run onboarding screen when storage is empty.
// Every smoke test starts from a fresh browser context, so dismiss onboarding before
// asserting dashboard behaviour. This keeps the tests aligned with the real UX instead
// of weakening selectors or hard-coding storage internals.
async function openApp(page) {
  await page.goto('/');
  const getStarted = page.getByRole('button', { name: /Get started/i });
  if (await getStarted.isVisible().catch(() => false)) {
    await getStarted.click();
  }
  await expect(page.getByRole('heading', { name: /Hi there/i })).toBeVisible();
}

test('loads with an empty dashboard and no leftover demo data', async ({ page }) => {
  await openApp(page);
  await expect(page.getByText(/No expenses yet/i)).toBeVisible();
});

test('can add an expense and see it on the dashboard', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: /Add expense/i }).first().click();

  await page.getByLabel(/Amount/i).fill('250');
  await page.getByLabel('Description').fill('Playwright smoke test expense');
  await page.getByRole('button', { name: /^Add expense$/ }).click();

  await expect(page.getByText('Playwright smoke test expense')).toBeVisible();
  await expect(page.getByText('₹250')).toBeVisible();
});

test('calendar day tap opens Add expense preset to that date', async ({ page }) => {
  await openApp(page);
  const todayCell = page.locator('.calCell.today');
  await expect(todayCell).toBeVisible();
  await todayCell.click();
  await expect(page.getByRole('heading', { name: 'Add expense' })).toBeVisible();
});

test('app lock: setting a PIN locks the app on next load', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Profile' }).click();
  await page.getByRole('button', { name: 'Set up app lock' }).click();
  await page.getByPlaceholder('••••').first().fill('1234');
  await page.getByPlaceholder('••••').nth(1).fill('1234');
  await page.getByRole('button', { name: 'Save PIN' }).click();
  await page.waitForFunction(() => !!window.localStorage.getItem('det-appLock'));

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Locked' })).toBeVisible();
  await page.getByPlaceholder('••••').fill('1234');
  await page.getByRole('button', { name: 'Unlock' }).click();
  await expect(page.getByRole('heading', { name: /Hi there/i })).toBeVisible();
});
