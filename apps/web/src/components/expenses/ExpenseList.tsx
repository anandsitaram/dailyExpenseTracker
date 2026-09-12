import React from 'react';
import { formatCurrency, isIncomeCategory } from '../../../../core/src/index.js';
import { Category, Expense } from '../../../../core/src/types.js';

export interface ExpenseListProps {
  items: Expense[];
  cats: Category[];
  currency?: string;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string | undefined) => void;
}

export function ExpenseList({ items, cats, currency = 'INR', onEdit, onDelete }: ExpenseListProps) {
  return (
    <div>
      {items.map((e) => {
        const c = cats.find((item) => item.id === e.category);
        const isInc = isIncomeCategory(cats, e.category);
        return (
          <div className={'expense' + (isInc ? ' incomeItem' : '')} key={e.id}>
            <span className="icon">{c?.icon || '📦'}</span>
            <div className="grow">
              <b>{e.description || c?.name || 'Uncategorized'}</b>
              <small>
                {c?.name || 'Uncategorized'} · {e.date} · {e.paymentMethod}
                {e.recurringId ? ' · 🔁' : ''}
              </small>
            </div>
            <strong className={isInc ? 'incomeAmount' : ''}>
              {isInc ? '+' : ''}
              {formatCurrency(e.amount, currency)}
            </strong>
            <button className="mini" onClick={() => onEdit(e)}>
              Edit
            </button>
            <button className="mini danger" onClick={() => onDelete(e.id)}>
              Delete
            </button>
          </div>
        );
      })}
      {!items.length && <div className="empty">No expenses found.</div>}
    </div>
  );
}
