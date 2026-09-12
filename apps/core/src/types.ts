export type ExpenseType = 'expense' | 'income';
export type PaymentMethod = 'Cash' | 'UPI' | 'Credit Card' | 'Debit Card' | 'Bank Transfer';
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly';

export interface Category {
  id: string;
  name: string;
  icon?: string;
  income?: boolean;
}

export interface Expense {
  id?: string;
  date: string;
  amount: number;
  category: string;
  description?: string;
  paymentMethod?: PaymentMethod | string;
  note?: string;
  type?: ExpenseType;
  recurringId?: string;
}

export interface RecurringExpense {
  id: string;
  amount: number;
  category: string;
  description?: string;
  paymentMethod?: PaymentMethod | string;
  note?: string;
  frequency: RecurringFrequency;
  nextDate: string;
}

export interface RecurringTemplate {
  id: string;
  amount: number;
  description?: string;
  category: string;
  paymentMethod?: PaymentMethod | string;
  note?: string;
  frequency: string;
  startDate: string;
  active: boolean;
  lastGeneratedDate?: string | null;
}

export interface Profile {
  firstName: string;
  lastName: string;
  nickName: string;
  email: string;
  avatar: string;
  avatarImage: string;
  currency?: string;
}

export interface BackupPayload {
  app: 'daily-expense-tracker';
  version: number;
  exportedAt: string;
  expenses: Expense[];
  categories: Category[];
  budget: number;
  categoryBudgets?: Record<string, number>;
  recurring?: RecurringExpense[];
  profile: Profile;
  currency?: string;
}
