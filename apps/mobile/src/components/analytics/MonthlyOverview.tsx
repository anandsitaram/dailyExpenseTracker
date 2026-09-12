import React from 'react';
import { View, Text } from 'react-native';
import { EmptyState } from '../common/EmptyState.js';
import { isIncomeCategory, formatCurrency } from '../../../../core/src/index.js';
import { Category, Expense } from '../../../../core/src/types.js';
import s from '../../styles/styles.js';

export interface MonthlyOverviewProps {
  expenses: Expense[];
  cats: Category[];
  currency?: string;
}

interface MonthTotals {
  month: string;
  expense: number;
  income: number;
}

export function MonthlyOverview({ expenses, cats, currency = 'INR' }: MonthlyOverviewProps) {
  const m: Record<string, MonthTotals> = {};
  expenses.forEach((e) => {
    const k = e.date.slice(0, 7);
    if (!m[k]) m[k] = { month: k, expense: 0, income: 0 };
    if (isIncomeCategory(cats, e.category)) m[k].income += Number(e.amount);
    else m[k].expense += Number(e.amount);
  });
  const rows = Object.values(m)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6);
  const max = Math.max(1, ...rows.map((r) => Math.max(r.expense, r.income)));

  return (
    <View>
      {rows.map((r) => (
        <View key={r.month} style={{ marginBottom: 14 }}>
          <Text style={s.bold}>{r.month}</Text>
          <View style={s.rowTop}>
            <Text style={s.muted}>Expense</Text>
            <Text style={s.muted}>{formatCurrency(r.expense, currency)}</Text>
          </View>
          <View style={s.track}>
            <View style={[s.fill, { width: `${(r.expense / max) * 100}%` }]} />
          </View>
          <View style={[s.rowTop, { marginTop: 6 }]}>
            <Text style={s.muted}>Income</Text>
            <Text style={s.muted}>{formatCurrency(r.income, currency)}</Text>
          </View>
          <View style={s.track}>
            <View style={[s.fill, s.fillWarn, { width: `${(r.income / max) * 100}%` }]} />
          </View>
        </View>
      ))}
      {!rows.length && (
        <EmptyState
          icon="📈"
          text="No data yet. Start adding expenses or income to see monthly trends."
        />
      )}
    </View>
  );
}
