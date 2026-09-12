import React, { FormEvent, useState } from 'react';
import { Panel } from '../common/Panel.js';
import { ExpenseList } from './ExpenseList.js';
import {
  paymentMethods,
  recurringFrequencies,
  frequencyLabels,
  todayDateKey,
} from '../../../../core/src/index.js';
import { Category, Expense } from '../../../../core/src/types.js';

interface ExpenseFormState {
  id?: string | null;
  date: string;
  amount: number | string;
  category: string;
  description: string;
  paymentMethod: string;
  note: string;
}

export interface ExpenseFormProps {
  initial?: Expense | null;
  presetDate?: string | null;
  cats: Category[];
  allExpenses?: Expense[];
  currency?: string;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string | undefined) => void;
  onCancel: () => void;
  onSave: (expense: Expense, repeat: string) => void;
}

export function ExpenseForm({
  initial,
  presetDate,
  cats,
  allExpenses,
  currency = 'INR',
  onEditExpense,
  onDeleteExpense,
  onCancel,
  onSave,
}: ExpenseFormProps) {
  const [f, setF] = useState<ExpenseFormState>(
    initial
      ? {
          id: initial.id ?? null,
          date: initial.date,
          amount: initial.amount,
          category: initial.category,
          description: initial.description ?? '',
          paymentMethod: initial.paymentMethod ?? 'UPI',
          note: initial.note ?? '',
        }
      : {
          id: null,
          date: presetDate || todayDateKey(),
          amount: '',
          category: cats[0]?.id || 'food',
          description: '',
          paymentMethod: 'UPI',
          note: '',
        },
  );
  const [repeat, setRepeat] = useState<string>('none');
  const set = <K extends keyof ExpenseFormState>(k: K, v: ExpenseFormState[K]) =>
    setF({ ...f, [k]: v });

  const sameDay = (allExpenses || [])
    .filter((e) => e.date === f.date && e.id !== f.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <Panel title={initial ? 'Edit expense' : 'Add expense'}>
        <form
          className="form"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (Number(f.amount) > 0)
              onSave({ ...f, amount: Number(f.amount), id: f.id || Date.now().toString() }, repeat);
          }}
        >
          <label>
            Amount
            <input
              autoFocus
              type="number"
              min="1"
              step="any"
              value={f.amount}
              onChange={(e) => set('amount', e.target.value)}
              placeholder="0"
              required
            />
          </label>
          <label>
            Date
            <input
              type="date"
              value={f.date}
              onChange={(e) => set('date', e.target.value)}
              required
            />
          </label>
          <label>
            Category
            <select value={f.category} onChange={(e) => set('category', e.target.value)}>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name} {c.income ? '(Income)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            Payment method
            <select value={f.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)}>
              {paymentMethods.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          {!initial && (
            <label>
              Repeat
              <select value={repeat} onChange={(e) => setRepeat(e.target.value)}>
                <option value="none">One-time</option>
                {recurringFrequencies.map((freq) => (
                  <option key={freq} value={freq}>
                    {frequencyLabels[freq]}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="wide">
            Description
            <input
              value={f.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="e.g. Lunch with team, Groceries, Client payment"
            />
          </label>
          <label className="wide">
            Notes
            <textarea
              value={f.note}
              onChange={(e) => set('note', e.target.value)}
              placeholder="Optional note or reference details"
            />
          </label>
          {!initial && repeat !== 'none' && (
            <p className="hint wide">
              This will create a recurring {frequencyLabels[repeat].toLowerCase()} expense starting{' '}
              {f.date}, and catch up on any occurrences automatically whenever you open the app.
            </p>
          )}
          <div className="actions">
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
            <button className="primary">
              {initial
                ? 'Save changes'
                : repeat !== 'none'
                  ? 'Add recurring expense'
                  : 'Add expense'}
            </button>
          </div>
        </form>
      </Panel>
      {sameDay.length > 0 && (
        <Panel title={`Other expenses on ${f.date}`}>
          <ExpenseList
            items={sameDay}
            cats={cats}
            currency={currency}
            onEdit={onEditExpense}
            onDelete={onDeleteExpense}
          />
        </Panel>
      )}
    </>
  );
}
