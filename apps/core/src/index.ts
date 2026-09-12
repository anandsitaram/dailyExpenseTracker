import { Category, Expense, Profile, RecurringTemplate } from './types.js';

export const defaultCategories: Category[] = [
  { id: 'salary', name: 'Salary', icon: '💵', income: true },
  { id: 'food', name: 'Food', icon: '🍔' },
  { id: 'groceries', name: 'Groceries', icon: '🛒' },
  { id: 'home', name: 'Home', icon: '🏠' },
  { id: 'transport', name: 'Transport', icon: '🚗' },
  { id: 'fuel', name: 'Fuel', icon: '⛽' },
  { id: 'medical', name: 'Medical', icon: '💊' },
  { id: 'bills', name: 'Bills', icon: '📱' },
  { id: 'education', name: 'Education', icon: '🎓' },
  { id: 'shopping', name: 'Shopping', icon: '👕' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
  { id: 'travel', name: 'Travel', icon: '✈️' },
  { id: 'investment', name: 'Investment', icon: '💰' },
  { id: 'gifts', name: 'Gifts', icon: '🎁' },
  { id: 'other', name: 'Other', icon: '📦' },
];

export const isIncomeCategory = (categories: Category[], id: string): boolean =>
  categories.find((c) => c.id === id)?.income === true;

export const paymentMethods: string[] = [
  'Cash',
  'UPI',
  'Credit Card',
  'Debit Card',
  'Bank Transfer',
];

export const avatarChoices: string[] = [
  '🙂',
  '😀',
  '😎',
  '🦁',
  '🐱',
  '🐶',
  '🌸',
  '⭐',
  '💼',
  '🎯',
  '🧑\u200d💻',
  '👩\u200d💻',
];

export const defaultProfile: Profile = {
  firstName: '',
  lastName: '',
  nickName: '',
  email: '',
  avatar: '🙂',
  avatarImage: '',
  currency: 'INR',
};

export const emptyExpenses: Expense[] = [];

export interface SupportedCurrency {
  code: string;
  symbol: string;
  label: string;
}

export const supportedCurrencies: SupportedCurrency[] = [
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'JPY', symbol: '¥', label: 'JPY (¥)' },
  { code: 'CAD', symbol: 'CA$', label: 'CAD (CA$)' },
  { code: 'AUD', symbol: 'A$', label: 'AUD (A$)' },
];

export const formatCurrency = (
  n: number | string | undefined | null,
  currencyCode: string = 'INR',
): string => {
  const num = Number(n) || 0;
  const localeMap: Record<string, string> = {
    INR: 'en-IN',
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
    JPY: 'ja-JP',
    CAD: 'en-CA',
    AUD: 'en-AU',
  };
  const locale = localeMap[currencyCode] || 'en-US';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(num);
  } catch (e) {
    return `${currencyCode} ${num.toLocaleString()}`;
  }
};

export const formatINR = (n: number | string | undefined | null): string =>
  formatCurrency(n, 'INR');

export const total = (xs: Array<{ amount: number | string }>): number =>
  xs.reduce((s, x) => s + Number(x.amount || 0), 0);

// --- date / calendar helpers ---
export const monthNames: string[] = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const weekdayLabels: string[] = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const pad2 = (n: number): string => String(n).padStart(2, '0');

export const dateKey = (y: number, m: number, d: number): string =>
  `${y}-${pad2(m + 1)}-${pad2(d)}`;

export const todayDateKey = (date: Date = new Date()): string =>
  dateKey(date.getFullYear(), date.getMonth(), date.getDate());

export const daysInMonth = (y: number, m: number): number => new Date(y, m + 1, 0).getDate();

export const firstWeekdayOfMonth = (y: number, m: number): number => new Date(y, m, 1).getDay();

export interface CalendarCell {
  day: number;
  y: number;
  m: number;
  inMonth: boolean;
}

export function buildCalendarGrid(y: number, m: number): CalendarCell[] {
  const totalDays = daysInMonth(y, m);
  const lead = firstWeekdayOfMonth(y, m);
  const prevTotal = daysInMonth(y, m - 1 < 0 ? 11 : m - 1);
  const prevYear = m - 1 < 0 ? y - 1 : y;
  const prevMonth = m - 1 < 0 ? 11 : m - 1;
  const nextYear = m + 1 > 11 ? y + 1 : y;
  const nextMonth = m + 1 > 11 ? 0 : m + 1;
  const cells: CalendarCell[] = [];

  for (let i = lead - 1; i >= 0; i--)
    cells.push({ day: prevTotal - i, y: prevYear, m: prevMonth, inMonth: false });
  for (let d = 1; d <= totalDays; d++) cells.push({ day: d, y, m, inMonth: true });
  while (cells.length % 7 !== 0 || cells.length < 42)
    cells.push({
      day: cells.length - lead - totalDays + 1,
      y: nextYear,
      m: nextMonth,
      inMonth: false,
    });
  return cells;
}

export interface ExpenseRow {
  Date: string;
  Amount: number;
  Category: string;
  Description: string;
  'Payment Method': string;
  Note: string;
}

export const toExpenseRows = (expenses: Expense[], categories: Category[]): ExpenseRow[] =>
  expenses.map((e) => ({
    Date: e.date,
    Amount: Number(e.amount) || 0,
    Category: categories.find((c) => c.id === e.category)?.name || e.category,
    Description: e.description || '',
    'Payment Method': e.paymentMethod || '',
    Note: e.note || '',
  }));

export const BACKUP_VERSION = 1;

export function buildBackupPayload({
  expenses,
  categories,
  budget,
  profile,
  categoryBudgets = {},
  recurring = [],
}: {
  expenses: Expense[];
  categories: Category[];
  budget: number;
  profile: Profile;
  categoryBudgets?: Record<string, number>;
  recurring?: RecurringTemplate[];
}): string {
  return JSON.stringify(
    {
      app: 'daily-expense-tracker',
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      expenses,
      categories,
      budget,
      categoryBudgets,
      recurring,
      profile,
    },
    null,
    2,
  );
}

export function parseBackupPayload(text: string) {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.expenses) || !Array.isArray(data.categories))
    throw new Error('Invalid backup file');
  return {
    expenses: data.expenses as Expense[],
    categories: data.categories as Category[],
    budget: Number(data.budget) || 0,
    categoryBudgets:
      data.categoryBudgets && typeof data.categoryBudgets === 'object' ? data.categoryBudgets : {},
    recurring: Array.isArray(data.recurring) ? (data.recurring as RecurringTemplate[]) : [],
    profile:
      data.profile && typeof data.profile === 'object'
        ? ({ ...defaultProfile, ...data.profile } as Profile)
        : defaultProfile,
  };
}

export function isEncryptedBackupText(text: string): boolean {
  try {
    const obj = JSON.parse(text);
    return !!(obj && obj.encrypted === true);
  } catch (e) {
    return false;
  }
}

export interface AppLockConfig {
  enabled: boolean;
  mode: 'pin' | 'biometric';
  pin: string;
}

export const defaultAppLock: AppLockConfig = { enabled: false, mode: 'pin', pin: '' };

export const isValidPin = (pin?: string | null): boolean => /^\d{4,6}$/.test(pin || '');

export const recurringFrequencies = ['daily', 'weekly', 'monthly'];

export const frequencyLabels: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month - 1);
}

export function nextDueDate(dateStr: string, frequency: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  if (frequency === 'daily') d.setUTCDate(d.getUTCDate() + 1);
  else if (frequency === 'weekly') d.setUTCDate(d.getUTCDate() + 7);
  else {
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + 1);
    d.setUTCDate(Math.min(day, daysInMonth(d.getUTCFullYear(), d.getUTCMonth())));
  }
  return dateKey(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function generateDueExpenses(
  templates: RecurringTemplate[],
  existingExpenses: Expense[],
  todayStr: string,
) {
  const newExpenses: Expense[] = [];
  const updatedTemplates = (templates || []).map((t) => ({ ...t }));
  for (const t of updatedTemplates) {
    if (!t.active) continue;
    let due: string = t.lastGeneratedDate
      ? nextDueDate(t.lastGeneratedDate, t.frequency)
      : t.startDate;
    let guard = 0;
    while (due <= todayStr && guard < 366) {
      const exists =
        existingExpenses.some((e) => e.recurringId === t.id && e.date === due) ||
        newExpenses.some((e) => e.recurringId === t.id && e.date === due);
      if (!exists) {
        newExpenses.push({
          id: `${t.id}-${due}`,
          amount: t.amount,
          description: t.description,
          date: due,
          category: t.category,
          paymentMethod: t.paymentMethod,
          note: t.note,
          recurringId: t.id,
        });
      }
      t.lastGeneratedDate = due;
      due = nextDueDate(due, t.frequency);
      guard++;
    }
  }
  return { newExpenses, updatedTemplates };
}

export interface QuickAddSuggestion {
  description: string;
  category: string;
  amount: number;
  paymentMethod?: string;
  count: number;
  lastDate: string;
}

export function computeQuickAddSuggestions(
  expenses: Expense[],
  limit: number = 6,
): QuickAddSuggestion[] {
  const groups: Record<string, QuickAddSuggestion> = {};
  for (const e of expenses) {
    const desc = (e.description || '').trim();
    if (!desc) continue;
    const key = desc.toLowerCase() + '|' + e.category + '|' + Number(e.amount);
    if (!groups[key])
      groups[key] = {
        description: desc,
        category: e.category,
        amount: Number(e.amount),
        paymentMethod: e.paymentMethod,
        count: 0,
        lastDate: e.date,
      };
    groups[key].count++;
    if (e.date > groups[key].lastDate) {
      groups[key].lastDate = e.date;
      groups[key].paymentMethod = e.paymentMethod;
    }
  }
  return Object.values(groups)
    .filter((g) => g.count >= 2)
    .sort((a, b) => b.count - a.count || b.lastDate.localeCompare(a.lastDate))
    .slice(0, limit);
}

export function computeStreaks(expenses: Array<{ date: string }>, todayStr: string) {
  const days = [...new Set(expenses.map((e) => e.date))].sort();
  if (!days.length) return { current: 0, longest: 0 };
  let longest = 1,
    run = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(`${days[i - 1]}T00:00:00Z`);
    const cur = new Date(`${days[i]}T00:00:00Z`);
    const diffDays = Math.round((cur.getTime() - prev.getTime()) / 86400000);
    if (diffDays === 1) {
      run++;
      longest = Math.max(longest, run);
    } else if (diffDays > 1) {
      run = 1;
    }
  }
  const daySet = new Set(days);
  let current = 0;
  let cursor = new Date(`${todayStr}T00:00:00Z`);
  if (!daySet.has(todayStr)) cursor.setDate(cursor.getDate() - 1);
  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    current++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return { current, longest };
}

function monthTotal(expenses: Expense[], categories: Category[], monthStr: string): number {
  return total(
    expenses.filter(
      (e) => e.date.startsWith(monthStr) && !isIncomeCategory(categories, e.category),
    ),
  );
}

function pctChange(prev: number, cur: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null;
  return ((cur - prev) / prev) * 100;
}

export function computePeriodComparison(
  expenses: Expense[],
  categories: Category[],
  todayStr: string,
) {
  const [y, m] = todayStr.split('-').map(Number);
  const curMonth = `${y}-${pad2(m)}`;
  const prevDate = new Date(y, m - 2, 1);
  const prevMonth = `${prevDate.getFullYear()}-${pad2(prevDate.getMonth() + 1)}`;
  const lastYearMonth = `${y - 1}-${pad2(m)}`;
  const curTotal = monthTotal(expenses, categories, curMonth);
  const prevTotal = monthTotal(expenses, categories, prevMonth);
  const lastYearTotal = monthTotal(expenses, categories, lastYearMonth);
  return {
    curMonth,
    prevMonth,
    lastYearMonth,
    curTotal,
    prevTotal,
    lastYearTotal,
    momPct: pctChange(prevTotal, curTotal),
    yoyPct: pctChange(lastYearTotal, curTotal),
  };
}

export function normalizeImportedRows(
  rows: Array<Record<string, unknown>>,
  categories: Category[],
) {
  const byName: Record<string, string> = {};
  categories.forEach((c) => {
    byName[c.name.trim().toLowerCase()] = c.id;
  });
  const fallbackCategory = categories.find((c) => !c.income)?.id || categories[0]?.id || 'food';
  const imported: Expense[] = [];
  let skipped = 0;
  rows.forEach((r, i) => {
    const get = (...keys: string[]) => {
      for (const k of keys) {
        for (const rk of Object.keys(r)) {
          if (rk.trim().toLowerCase() === k) return r[rk];
        }
      }
      return undefined;
    };
    const rawDate = get('date');
    const rawAmount = get('amount');
    const amount = Number(rawAmount);
    const dateStr = normalizeDate(rawDate);
    if (!dateStr || !amount || amount <= 0) {
      skipped++;
      return;
    }
    const catName = (get('category') || '').toString().trim().toLowerCase();
    imported.push({
      id: 'import-' + Date.now() + '-' + i,
      date: dateStr,
      amount,
      category: byName[catName] || fallbackCategory,
      description: (get('description') || '').toString(),
      paymentMethod: (get('payment method', 'paymentmethod') || 'Cash').toString(),
      note: (get('note') || '').toString(),
    });
  });
  return { imported, skipped };
}

function normalizeDate(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (isValidDateKey(s)) return s;
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}
