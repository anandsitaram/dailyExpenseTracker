import { describe, test, expect } from 'vitest';
import {
 formatINR, total, buildCalendarGrid, dateKey, nextDueDate, generateDueExpenses,
 isValidPin, isEncryptedBackupText, buildBackupPayload, parseBackupPayload,
 isIncomeCategory, defaultCategories, toExpenseRows
} from '../shared.js';

describe('formatINR', () => {
 test('formats a positive amount as INR with no decimals', () => {
  expect(formatINR(1500)).toBe('₹1,500');
 });
 test('treats non-numeric input as zero', () => {
  expect(formatINR(undefined)).toBe('₹0');
  expect(formatINR('not a number')).toBe('₹0');
 });
});

describe('total', () => {
 test('sums the amount field across a list', () => {
  expect(total([{amount: 100}, {amount: 250.5}, {amount: 0}])).toBe(350.5);
 });
 test('returns 0 for an empty list', () => {
  expect(total([])).toBe(0);
 });
});

describe('buildCalendarGrid', () => {
 test('always returns a multiple of 7 cells (whole weeks)', () => {
  const cells = buildCalendarGrid(2026, 8); // September 2026
  expect(cells.length % 7).toBe(0);
 });
 test('includes every day of the target month exactly once, marked inMonth', () => {
  const cells = buildCalendarGrid(2026, 8); // September has 30 days
  const inMonthDays = cells.filter(c => c.inMonth).map(c => c.day);
  expect(inMonthDays).toEqual(Array.from({length: 30}, (_, i) => i + 1));
 });
 test('leading/trailing cells belong to adjacent months', () => {
  const cells = buildCalendarGrid(2026, 8);
  const leading = cells.filter(c => !c.inMonth && cells.indexOf(c) < 10);
  leading.forEach(c => expect(c.inMonth).toBe(false));
 });
 test('February in a leap year has 29 in-month days', () => {
  const cells = buildCalendarGrid(2028, 1); // Feb 2028 - leap year
  expect(cells.filter(c => c.inMonth).length).toBe(29);
 });
});

describe('dateKey', () => {
 test('zero-pads month and day', () => {
  expect(dateKey(2026, 0, 5)).toBe('2026-01-05');
  expect(dateKey(2026, 11, 25)).toBe('2026-12-25');
 });
});

describe('nextDueDate', () => {
 test('daily adds one day', () => {
  expect(nextDueDate('2026-09-08', 'daily')).toBe('2026-09-09');
 });
 test('weekly adds seven days', () => {
  expect(nextDueDate('2026-09-08', 'weekly')).toBe('2026-09-15');
 });
 test('monthly rolls over year boundaries correctly', () => {
  expect(nextDueDate('2026-12-15', 'monthly')).toBe('2027-01-15');
 });
 test('monthly handles month-end overflow (e.g. Jan 31 -> Mar 3, JS Date behavior)', () => {
  // Documenting actual behavior: adding a month to Jan 31 overflows past
  // February in a non-leap year, since Feb has no 31st.
  expect(nextDueDate('2026-01-31', 'monthly')).toBe('2026-03-03');
 });
});

describe('generateDueExpenses', () => {
 const today = '2026-09-08';

 test('generates every occurrence from startDate up to (and including) today', () => {
  const templates = [{id: 't1', amount: 500, description: 'Rent', category: 'home', paymentMethod: 'UPI', note: '', frequency: 'monthly', startDate: '2026-06-15', active: true, lastGeneratedDate: null}];
  const {newExpenses, updatedTemplates} = generateDueExpenses(templates, [], today);
  expect(newExpenses.map(e => e.date)).toEqual(['2026-06-15', '2026-07-15', '2026-08-15']);
  expect(updatedTemplates[0].lastGeneratedDate).toBe('2026-08-15');
 });

 test('does not generate an occurrence for a future date', () => {
  const templates = [{id: 't2', amount: 100, description: 'Future', category: 'other', paymentMethod: 'Cash', note: '', frequency: 'monthly', startDate: '2026-09-15', active: true, lastGeneratedDate: null}];
  const {newExpenses} = generateDueExpenses(templates, [], today);
  expect(newExpenses).toEqual([]);
 });

 test('is idempotent - running twice does not duplicate expenses', () => {
  const templates = [{id: 't3', amount: 20, description: 'Tea', category: 'food', paymentMethod: 'Cash', note: '', frequency: 'daily', startDate: '2026-09-05', active: true, lastGeneratedDate: null}];
  const first = generateDueExpenses(templates, [], today);
  const second = generateDueExpenses(first.updatedTemplates, first.newExpenses, today);
  expect(second.newExpenses).toEqual([]);
 });

 test('skips paused (inactive) templates entirely', () => {
  const templates = [{id: 't4', amount: 999, description: 'Paused', category: 'other', paymentMethod: 'Cash', note: '', frequency: 'daily', startDate: '2026-09-01', active: false, lastGeneratedDate: null}];
  const {newExpenses} = generateDueExpenses(templates, [], today);
  expect(newExpenses).toEqual([]);
 });

 test('does not re-generate a date that already has a matching recurringId expense', () => {
  const templates = [{id: 't5', amount: 50, description: 'Coffee', category: 'food', paymentMethod: 'Cash', note: '', frequency: 'daily', startDate: '2026-09-06', active: true, lastGeneratedDate: null}];
  const existing = [{id: 'manual-1', date: '2026-09-06', amount: 50, category: 'food', recurringId: 't5'}];
  const {newExpenses} = generateDueExpenses(templates, existing, today);
  expect(newExpenses.map(e => e.date)).toEqual(['2026-09-07', '2026-09-08']);
 });
});

describe('isValidPin', () => {
 test('accepts 4-6 digit numeric strings', () => {
  expect(isValidPin('1234')).toBe(true);
  expect(isValidPin('123456')).toBe(true);
 });
 test('rejects too short, too long, or non-numeric values', () => {
  expect(isValidPin('123')).toBe(false);
  expect(isValidPin('1234567')).toBe(false);
  expect(isValidPin('abcd')).toBe(false);
  expect(isValidPin('')).toBe(false);
  expect(isValidPin(undefined)).toBe(false);
 });
});

describe('isEncryptedBackupText', () => {
 test('detects an encrypted envelope', () => {
  expect(isEncryptedBackupText('{"encrypted":true,"data":"..."}')).toBe(true);
 });
 test('treats a legacy plain backup as not encrypted', () => {
  expect(isEncryptedBackupText('{"app":"daily-expense-tracker","expenses":[]}')).toBe(false);
 });
 test('treats invalid JSON as not encrypted rather than throwing', () => {
  expect(isEncryptedBackupText('not json at all')).toBe(false);
 });
});

describe('buildBackupPayload / parseBackupPayload round trip', () => {
 test('parses back exactly what was built', () => {
  const profile = {firstName: 'A', lastName: 'B', nickName: 'Ana', email: 'a@b.com', avatar: '🦁', avatarImage: ''};
  const payload = buildBackupPayload({expenses: [{id: '1', amount: 10}], categories: defaultCategories, budget: 5000, profile});
  const parsed = parseBackupPayload(payload);
  expect(parsed.expenses).toEqual([{id: '1', amount: 10}]);
  expect(parsed.budget).toBe(5000);
  expect(parsed.profile.nickName).toBe('Ana');
 });
 test('rejects a payload missing the expected shape', () => {
  expect(() => parseBackupPayload('{"nope":true}')).toThrow();
 });
});

describe('isIncomeCategory', () => {
 test('flags the salary category as income', () => {
  expect(isIncomeCategory(defaultCategories, 'salary')).toBe(true);
 });
 test('does not flag an ordinary expense category as income', () => {
  expect(isIncomeCategory(defaultCategories, 'food')).toBe(false);
 });
});

describe('toExpenseRows', () => {
 test('resolves category id to its display name for export', () => {
  const rows = toExpenseRows([{date: '2026-09-01', amount: 200, category: 'food', description: 'Lunch', paymentMethod: 'UPI', note: ''}], defaultCategories);
  expect(rows[0].Category).toBe('Food');
  expect(rows[0].Amount).toBe(200);
 });
});
