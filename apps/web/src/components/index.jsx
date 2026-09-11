import React, { useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { Plus, X, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import {
  formatINR,
  total,
  monthNames,
  weekdayLabels,
  dateKey,
  buildCalendarGrid,
  isIncomeCategory,
  recurringFrequencies,
  frequencyLabels,
  avatarChoices,
} from '../../../../packages/core/src/index.js';
const PALETTE = ['#8BC63E', '#F5A623', '#4C8EF7', '#B98BF0', '#F26D6D', '#39B8A6'];
const today = () => new Date().toISOString().slice(0, 10);
function LockScreen({ appLock, onUnlock }) {
  const [pin, setPin] = useState(''),
    [error, setError] = useState('');
  function tryPin(e) {
    e.preventDefault();
    if (pin === appLock.pin) onUnlock();
    else {
      setError('Incorrect PIN');
      setPin('');
    }
  }
  return (
    <div className="app" style={{ display: 'block' }}>
      <div className="lockWrap">
        <div className="lockIcon">
          <Lock size={40} strokeWidth={1.6} />
        </div>
        <h1>Locked</h1>
        <p className="hint">Enter your PIN to continue</p>
        <form onSubmit={tryPin}>
          <input
            className="pinInput"
            type="password"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError('');
            }}
            placeholder="••••"
          />
          {!!error && (
            <p className="hint" style={{ color: '#b23b3b' }}>
              {error}
            </p>
          )}
          <button className="primary" style={{ marginTop: 14 }}>
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}

function Onboarding({ onDone }) {
  return (
    <div className="app" style={{ display: 'block' }}>
      <div className="onboardWrap">
        <div className="onboardEmoji">💰</div>
        <h1 style={{ textAlign: 'center' }}>Welcome to Daily Expense Tracker</h1>
        <p className="hint" style={{ textAlign: 'center', marginBottom: 26 }}>
          A few things before you start:
        </p>
        <div className="onboardRow">
          <span className="onboardIcon">✍️</span>
          <div>
            <b>Log expenses in seconds</b>
            <p className="hint">
              Click a date on the calendar, or the Add expense button, to add one. No account or
              setup needed.
            </p>
          </div>
        </div>
        <div className="onboardRow">
          <span className="onboardIcon">🎯</span>
          <div>
            <b>Set a budget anytime</b>
            <p className="hint">
              See exactly what's left to spend this month, overall or per category.
            </p>
          </div>
        </div>
        <div className="onboardRow">
          <span className="onboardIcon">🔒</span>
          <div>
            <b>Everything stays private</b>
            <p className="hint">
              Your data is encrypted in this browser and never leaves it unless you export a backup
              yourself.
            </p>
          </div>
        </div>
        <button className="primary" style={{ marginTop: 16 }} onClick={onDone}>
          Get started
        </button>
      </div>
    </div>
  );
}

function AppLockPanel({ appLock, setAppLock, onUnlockNow }) {
  const [showSetup, setShowSetup] = useState(false),
    [pinDraft, setPinDraft] = useState(''),
    [pinConfirm, setPinConfirm] = useState('');
  async function persistLock(nextLock) {
    await secureSet('det-appLock', nextLock).catch(console.error);
    setAppLock(nextLock);
  }
  async function savePin() {
    if (!isValidPin(pinDraft)) return alert('Use a 4-6 digit PIN');
    if (pinDraft !== pinConfirm) return alert("PINs don't match");
    await persistLock({ enabled: true, mode: 'pin', pin: pinDraft });
    onUnlockNow();
    setPinDraft('');
    setPinConfirm('');
    setShowSetup(false);
  }
  async function turnOff() {
    if (
      !confirm(
        'Turn off app lock? Anyone who opens this browser tab will be able to see your data.',
      )
    )
      return;
    await persistLock(defaultAppLock);
    onUnlockNow();
  }
  return (
    <Panel title="App lock">
      {appLock.enabled ? (
        <>
          <p className="hint">
            App lock is on. You'll need your PIN to open the app on this browser.
          </p>
          {showSetup ? (
            <PinSetupForm
              pinDraft={pinDraft}
              setPinDraft={setPinDraft}
              pinConfirm={pinConfirm}
              setPinConfirm={setPinConfirm}
              onSave={savePin}
              onCancel={() => setShowSetup(false)}
            />
          ) : (
            <div className="toolbar">
              <button onClick={() => setShowSetup(true)}>Change PIN</button>
              <button className="danger" onClick={turnOff}>
                Turn off app lock
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="hint">
            Require a PIN to open the app - a good idea for a finance app, especially on a shared
            computer.
          </p>
          {showSetup ? (
            <PinSetupForm
              pinDraft={pinDraft}
              setPinDraft={setPinDraft}
              pinConfirm={pinConfirm}
              setPinConfirm={setPinConfirm}
              onSave={savePin}
              onCancel={() => setShowSetup(false)}
            />
          ) : (
            <button className="primary mini" onClick={() => setShowSetup(true)}>
              Set up app lock
            </button>
          )}
        </>
      )}
    </Panel>
  );
}

function PinSetupForm({ pinDraft, setPinDraft, pinConfirm, setPinConfirm, onSave, onCancel }) {
  return (
    <div className="form" style={{ marginTop: 10 }}>
      <label>
        New PIN (4-6 digits)
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pinDraft}
          onChange={(e) => setPinDraft(e.target.value)}
          placeholder="••••"
        />
      </label>
      <label>
        Confirm PIN
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pinConfirm}
          onChange={(e) => setPinConfirm(e.target.value)}
          placeholder="••••"
        />
      </label>
      <div className="actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="primary" onClick={onSave}>
          Save PIN
        </button>
      </div>
    </div>
  );
}

const Metric = ({ title, value, highlight, warn }) => (
  <div className={'card' + (highlight ? ' highlight' : '') + (warn ? ' warn' : '')}>
    <span>{title}</span>
    <strong>{value}</strong>
  </div>
);
const Panel = ({ title, children }) => (
  <section className="panel">
    <div className="panelHead">
      <h2>{title}</h2>
    </div>
    {children}
  </section>
);
const EmptyState = ({ icon, text, actionLabel, onAction }) => (
  <div className="empty">
    <div className="emptyIcon">{icon}</div>
    <p>{text}</p>
    {actionLabel && (
      <button className="primary mini" onClick={onAction}>
        {actionLabel}
      </button>
    )}
  </div>
);

function ExpenseList({ items, cats, onEdit, onDelete }) {
  return (
    <div>
      {items.map((e) => {
        const c = cats.find((c) => c.id === e.category);
        return (
          <div className="expense" key={e.id}>
            <span className="icon">{c?.icon || '📦'}</span>
            <div className="grow">
              <b>{e.description || c?.name || 'Uncategorized'}</b>
              <small>
                {c?.name || 'Uncategorized'} · {e.date} · {e.paymentMethod}
                {e.recurringId ? ' · 🔁' : ''}
              </small>
            </div>
            <strong>{formatINR(e.amount)}</strong>
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

function ExpenseForm({
  initial,
  presetDate,
  cats,
  allExpenses,
  onEditExpense,
  onDeleteExpense,
  onCancel,
  onSave,
}) {
  const [f, setF] = useState(
    initial || {
      id: null,
      date: presetDate || today(),
      amount: '',
      category: cats[0]?.id,
      description: '',
      paymentMethod: 'UPI',
      note: '',
    },
  );
  const [repeat, setRepeat] = useState('none');
  const set = (k, v) => setF({ ...f, [k]: v });
  // same-day expenses shown below the form
  const sameDay = (allExpenses || [])
    .filter((e) => e.date === f.date && e.id !== f.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <Panel title={initial ? 'Edit expense' : 'Add expense'}>
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            if (Number(f.amount) > 0)
              onSave({ ...f, amount: Number(f.amount), id: f.id || Date.now().toString() }, repeat);
          }}
        >
          <label>
            Amount (₹)
            <input
              autoFocus
              type="number"
              min="1"
              value={f.amount}
              onChange={(e) => set('amount', e.target.value)}
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
                  {c.icon} {c.name}
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
                {recurringFrequencies.map((f) => (
                  <option key={f} value={f}>
                    {frequencyLabels[f]}
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
              placeholder="e.g. Lunch with family"
            />
          </label>
          <label className="wide">
            Notes
            <textarea
              value={f.note}
              onChange={(e) => set('note', e.target.value)}
              placeholder="Optional note"
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
            onEdit={onEditExpense}
            onDelete={onDeleteExpense}
          />
        </Panel>
      )}
    </>
  );
}

function CategoryManager({ cats, setCats, expenses }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(CATEGORY_ICON_CHOICES[0]);
  function add() {
    if (!name.trim()) return;
    setCats([...cats, { id: 'custom-' + Date.now(), name: name.trim(), icon }]);
    setName('');
    setIcon(CATEGORY_ICON_CHOICES[0]);
  }
  function removeCat(id) {
    const count = expenses.filter((e) => e.category === id).length;
    const msg =
      count > 0
        ? `This category is used by ${count} expense${count === 1 ? '' : 's'}. Deleting it won't delete those expenses, but they'll show as "Uncategorized". Continue?`
        : 'Delete this category?';
    if (confirm(msg)) setCats(cats.filter((c) => c.id !== id));
  }
  return (
    <Panel title="Categories">
      <div className="toolbar">
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
        <button className="primary btnRow" onClick={add}>
          <Plus size={16} /> Add category
        </button>
      </div>
      <div className="catGrid">
        {cats.map((c) => (
          <div className="cat" key={c.id}>
            <span>{c.icon}</span>
            <b>{c.name}</b>
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

function Profile({ profile, setProfile }) {
  const set = (k, v) => setProfile({ ...profile, [k]: v });
  function onPickImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfile((p) => ({ ...p, avatarImage: reader.result }));
    reader.readAsDataURL(file);
    e.target.value = '';
  }
  return (
    <Panel title="Profile">
      <div className="avatarRow">
        <div className="avatarPreview">
          {profile.avatarImage ? (
            <img src={profile.avatarImage} alt="Profile" />
          ) : (
            <span>{profile.avatar || '🙂'}</span>
          )}
        </div>
        <div className="avatarActions">
          <label className="mini fileBtn">
            Upload photo
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={onPickImage}
            />
          </label>
          {profile.avatarImage && (
            <button className="mini danger" onClick={() => set('avatarImage', '')}>
              Remove photo
            </button>
          )}
        </div>
      </div>
      <div className="avatarPicker">
        {avatarChoices.map((em) => (
          <button
            type="button"
            key={em}
            className={
              'avatarChip' + (profile.avatar === em && !profile.avatarImage ? ' selected' : '')
            }
            onClick={() => {
              set('avatar', em);
              set('avatarImage', '');
            }}
          >
            {em}
          </button>
        ))}
      </div>
      <div className="form">
        <label>
          First name
          <input
            value={profile.firstName || ''}
            onChange={(e) => set('firstName', e.target.value)}
            placeholder="Jane"
          />
        </label>
        <label>
          Last name
          <input
            value={profile.lastName || ''}
            onChange={(e) => set('lastName', e.target.value)}
            placeholder="Doe"
          />
        </label>
        <label>
          Nickname
          <input
            value={profile.nickName || ''}
            onChange={(e) => set('nickName', e.target.value)}
            placeholder="How the dashboard greets you"
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={profile.email || ''}
            onChange={(e) => set('email', e.target.value)}
            placeholder="jane@example.com"
          />
        </label>
      </div>
      <p className="hint">
        Saved automatically, and encrypted at rest like the rest of your data. Set a nickname to
        personalize your dashboard greeting.
      </p>
    </Panel>
  );
}

function Budget({ budget, setBudget, spent }) {
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const remaining = budget - spent;
  return (
    <Panel title="Monthly budget">
      <div className="budgetTop">
        <div>
          <span>Spent</span>
          <h2>{formatINR(spent)}</h2>
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
            <span>{formatINR(Math.max(0, remaining))} remaining</span>
          </div>
          {pct >= 80 && <div className="alert">⚠️ You are approaching your monthly budget.</div>}
        </>
      ) : (
        <p className="hint">Set a budget above to track your spending against it.</p>
      )}
    </Panel>
  );
}

const Donut = ({ data }) => (
  <div className="chart">
    <ResponsiveContainer>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => formatINR(v)} />
      </PieChart>
    </ResponsiveContainer>
  </div>
);
const Trend = ({ data }) => (
  <div className="chart">
    <ResponsiveContainer>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip formatter={(v) => formatINR(v)} />
        <Line type="monotone" dataKey="amount" stroke="#8BC63E" strokeWidth={3} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);
function MonthlyBars({ expenses, categories }) {
  let m = {};
  expenses.forEach((e) => {
    let k = e.date.slice(0, 7);
    if (!m[k]) m[k] = { month: k, expense: 0, income: 0 };
    if (isIncomeCategory(categories, e.category)) m[k].income += Number(e.amount);
    else m[k].expense += Number(e.amount);
  });
  let d = Object.values(m)
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
      <ResponsiveContainer>
        <BarChart data={d}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(v) => formatINR(v)} />
          <Bar dataKey="expense" name="Expense" fill="#8BC63E" radius={[6, 6, 0, 0]} />
          <Bar dataKey="income" name="Income" fill="#F5A623" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CalendarView({ year, month, spendByDay, onSelectDay, onPrev, onNext }) {
  const cells = useMemo(() => buildCalendarGrid(year, month), [year, month]);
  const todayKey = today();
  return (
    <div className="calendar">
      <div className="panelHead">
        <h2 style={{ fontSize: 14 }}>
          {monthNames[month]} {year}
        </h2>
        <div className="navBtns">
          <button onClick={onPrev}>
            <ChevronLeft size={16} />
          </button>
          <button onClick={onNext}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="calGrid">
        {weekdayLabels.map((w) => (
          <div className="calDow" key={w}>
            {w}
          </div>
        ))}
        {cells.map((c, i) => {
          const key = dateKey(c.y, c.m, c.day);
          const amt = spendByDay[key];
          return (
            <div
              key={i}
              className={
                'calCell' +
                (c.inMonth ? '' : ' outMonth') +
                (key === todayKey ? ' today' : '') +
                (amt ? ' hasSpend' : '')
              }
              onClick={() => c.inMonth && onSelectDay(key)}
            >
              <span className="calDay">{c.day}</span>
              {amt ? <span className="calAmt">{formatINR(amt).replace('₹', '')}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export {
  LockScreen,
  Onboarding,
  AppLockPanel,
  PinSetupForm,
  Metric,
  Panel,
  EmptyState,
  ExpenseList,
  ExpenseForm,
  CategoryManager,
  Profile,
  Budget,
  Donut,
  Trend,
  MonthlyBars,
  CalendarView,
};
