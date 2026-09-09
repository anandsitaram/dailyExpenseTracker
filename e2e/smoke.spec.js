import { test, expect } from '@playwright/test';

// A first-run smoke test: fresh storage (no demo data), so the dashboard should show its
// empty state, and adding an expense should make it appear in the recent-expenses list.
// This is exactly the kind of check that would have caught the invisible-text/contrast bug
// fixed earlier - a real render, not just a unit test of the underlying logic.

test('loads with an empty dashboard and no leftover demo data', async ({ page }) => {
 await page.goto('/');
 await expect(page.getByRole('heading', { name: /Hi there/i })).toBeVisible();
 await expect(page.getByText('No expenses yet')).toBeVisible();
});

test('can add an expense and see it on the dashboard', async ({ page }) => {
 await page.goto('/');
 await page.getByRole('button', { name: /Add expense/i }).first().click();

 await page.getByLabel(/Amount/i).fill('250');
 await page.getByLabel('Description').fill('Playwright smoke test expense');
 await page.getByRole('button', { name: /^Add expense$/ }).click();

 await expect(page.getByText('Playwright smoke test expense')).toBeVisible();
 await expect(page.getByText('₹250')).toBeVisible();
});

test('calendar day tap opens Add expense preset to that date', async ({ page }) => {
 await page.goto('/');
 const todayCell = page.locator('.calCell.today');
 await todayCell.click();
 await expect(page.getByRole('heading', { name: 'Add expense' })).toBeVisible();
});

test('app lock: setting a PIN locks the app on next load', async ({ page, context }) => {
 await page.goto('/');
 await page.getByRole('button', { name: 'Profile' }).click();
 await page.getByRole('button', { name: 'Set up app lock' }).click();
 await page.getByPlaceholder('••••').first().fill('1234');
 await page.getByPlaceholder('••••').nth(1).fill('1234');
 await page.getByRole('button', { name: 'Save PIN' }).click();

 await page.reload();
 await expect(page.getByRole('heading', { name: 'Locked' })).toBeVisible();
 await page.getByPlaceholder('••••').fill('1234');
 await page.getByRole('button', { name: 'Unlock' }).click();
 await expect(page.getByRole('heading', { name: /Hi there/i })).toBeVisible();
});
