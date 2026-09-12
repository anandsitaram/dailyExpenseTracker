import React, { Dispatch, SetStateAction, useState } from 'react';
import { Panel } from '../common/Panel.js';
import { Plus, X } from 'lucide-react';
import { Category, Expense } from '../../../../core/src/types.js';

const CATEGORY_ICON_CHOICES = [
  '🏷️',
  '🍽️',
  '🚕',
  '🏋️',
  '🎮',
  '📚',
  '🧾',
  '🐾',
  '🎁',
  '✈️',
  '🧹',
  '🔧',
];

export interface CategoryManagerProps {
  cats: Category[];
  setCats: Dispatch<SetStateAction<Category[]>>;
  expenses: Expense[];
}

export function CategoryManager({ cats, setCats, expenses }: CategoryManagerProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(CATEGORY_ICON_CHOICES[0]);
  const [isIncome, setIsIncome] = useState(false);

  function add() {
    if (!name.trim()) return;
    setCats([
      ...cats,
      {
        id: 'custom-' + Date.now(),
        name: name.trim(),
        icon,
        ...(isIncome ? { income: true } : {}),
      },
    ]);
    setName('');
    setIcon(CATEGORY_ICON_CHOICES[0]);
    setIsIncome(false);
  }

  function removeCat(id: string) {
    const count = expenses.filter((e) => e.category === id).length;
    const msg =
      count > 0
        ? `This category is used by ${count} expense${count === 1 ? '' : 's'}. Deleting it won't delete those expenses, but they'll show as "Uncategorized". Continue?`
        : 'Delete this category?';
    if (confirm(msg)) setCats(cats.filter((c) => c.id !== id));
  }

  return (
    <Panel title="Categories">
      <div className="toolbar" style={{ flexWrap: 'wrap', gap: '10px' }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name"
        />
        <div className="iconPicker">
          {CATEGORY_ICON_CHOICES.map((em) => (
            <button
              type="button"
              key={em}
              className={'avatarChip small' + (icon === em ? ' selected' : '')}
              onClick={() => setIcon(em)}
            >
              {em}
            </button>
          ))}
        </div>
        <label
          className="checkboxLabel"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        >
          <input
            type="checkbox"
            checked={isIncome}
            onChange={(e) => setIsIncome(e.target.checked)}
          />
          Is Income Category
        </label>
        <button className="primary btnRow" onClick={add}>
          <Plus size={16} /> Add category
        </button>
      </div>
      <div className="catGrid">
        {cats.map((c) => (
          <div className="cat" key={c.id}>
            <span>{c.icon}</span>
            <b>{c.name}</b>
            {c.income && <small style={{ color: '#2e7d32', marginLeft: 4 }}>(Income)</small>}
            {c.id.startsWith('custom-') && (
              <button
                className="mini danger iconBtn"
                style={{ marginLeft: 'auto' }}
                onClick={() => removeCat(c.id)}
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}
