import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { EmptyState } from '../common/EmptyState.js';
import { isIncomeCategory, formatCurrency } from '../../../../core/src/index.js';
import { Category, Expense } from '../../../../core/src/types.js';

export interface MonthlyBarsProps {
  expenses: Expense[];
  categories: Category[];
  currency?: string;
}

interface MonthTotals {
  month: string;
  expense: number;
  income: number;
}

export function MonthlyBars({ expenses, categories, currency = 'INR' }: MonthlyBarsProps) {
  const m: Record<string, MonthTotals> = {};
  expenses.forEach((e) => {
    const k = e.date.slice(0, 7);
    if (!m[k]) m[k] = { month: k, expense: 0, income: 0 };
    if (isIncomeCategory(categories, e.category)) m[k].income += Number(e.amount);
    else m[k].expense += Number(e.amount);
  });
  const d = Object.values(m)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6);

  if (!d.length)
    return (
      <EmptyState
        icon="📈"
        text="No data yet. Start adding expenses or income to see monthly trends."
      />
    );

  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={d}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(v) => formatCurrency(Number(v), currency)} />
          <Bar dataKey="expense" name="Expense" fill="#2e7d32" radius={[6, 6, 0, 0]} />
          <Bar dataKey="income" name="Income" fill="#f5a623" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
