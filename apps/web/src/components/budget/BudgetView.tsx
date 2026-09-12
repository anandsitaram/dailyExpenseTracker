import React from 'react';
import { Panel } from '../common/Panel.js';
import { formatCurrency } from '../../../../core/src/index.js';

export interface BudgetProps {
  budget: number;
  setBudget: (value: number) => void;
  spent: number;
  currency?: string;
}

export function Budget({ budget, setBudget, spent, currency = 'INR' }: BudgetProps) {
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const remaining = budget - spent;

  return (
    <Panel title="Monthly budget">
      <div className="budgetTop">
        <div>
          <span>Spent</span>
          <h2>{formatCurrency(spent, currency)}</h2>
        </div>
        <div>
          <span>Budget</span>
          <input
            className="budgetInput"
            type="number"
            placeholder="Enter your monthly budget"
            value={budget || ''}
            onChange={(e) => setBudget(Number(e.target.value) || 0)}
          />
        </div>
      </div>
      {budget > 0 ? (
        <>
          <div className={'progress' + (pct >= 80 ? ' warn' : '')}>
            <i style={{ width: pct + '%' }} />
          </div>
          <div className="budgetMeta">
            <b>{pct.toFixed(0)}% used</b>
            <span>{formatCurrency(Math.max(0, remaining), currency)} remaining</span>
          </div>
          {pct >= 80 && <div className="alert">⚠️ You are approaching your monthly budget.</div>}
        </>
      ) : (
        <p className="hint">Set a budget above to track your spending against it.</p>
      )}
    </Panel>
  );
}
