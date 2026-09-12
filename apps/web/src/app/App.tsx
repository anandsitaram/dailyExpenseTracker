import { ChangeEvent, useEffect, useState } from 'react';
import {
  PieChart as PieChartIcon,
  Home,
  ListChecks,
  Plus,
  Target,
  Tags,
  User,
  Download,
  Upload,
  Flame,
  TrendingUp,
  TrendingDown,
  LucideIcon,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  defaultCategories,
  formatCurrency,
  formatINR,
  total,
  monthNames,
  buildBackupPayload,
  parseBackupPayload,
  isEncryptedBackupText,
  frequencyLabels,
  normalizeImportedRows,
  todayDateKey,
  toExpenseRows,
} from '../../../core/src/index.js';
import { useExpenseTracker } from '../../../core/src/useExpenseTracker.js';
import { secureGet, secureSet } from '../services/storage.js';
import { encryptBackupPayload, decryptBackupPayload } from '../../../core/src/backupCrypto.js';
import {
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
  LockScreen,
  Onboarding,
  AppLockPanel,
} from '../components/index.js';
import { Expense } from '../../../core/src/types.js';
import '../styles/style.css';
const today = todayDateKey;
type TabKey = 'dashboard' | 'expenses' | 'analytics' | 'budget' | 'categories' | 'profile' | 'add';
function App() {
  const {
    expenses,
    setExpenses,
    categories,
    setCategories,
    budget,
    setBudget,
    categoryBudgets,
    setCategoryBudgets,
    recurring,
    setRecurring,
    appLock,
    setAppLock,
    profile,
    setProfile,
    theme,
    setTheme,
    onboardingDone,
    setOnboardingDone,
    loaded,
    loadError,
    search,
    setSearch,
    filter,
    setFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    amountMin,
    setAmountMin,
    amountMax,
    setAmountMax,
    typeFilter,
    setTypeFilter,
    month,
    monthTotal,
    monthIncomeTotal,
    remaining,
    byCat,
    categorySpend,
    daily,
    spendByDay,
    visibleExpenses: visible,
    quickAdd,
    streaks,
    comparison,
    dateFilterActive,
    singleDaySelected,
    undoState,
    undoLast,
    saveExpense: saveTrackedExpense,
    removeExpense: removeTrackedExpense,
    addQuickExpense: addTrackedQuickExpense,
    toggleRecurring: toggleTrackedRecurring,
    setCategoryBudget: setTrackedCategoryBudget,
  } = useExpenseTracker({
    storage: {
      get: (key, fallback) => secureGet(`det-${key}`, fallback),
      set: (key, value) => secureSet(`det-${key}`, value),
    },
  });
  const [tab, setTab] = useState<TabKey>('dashboard'),
    [editing, setEditing] = useState<Expense | null>(null);
  const [addPresetDate, setAddPresetDate] = useState<string | null>(null);
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  // --- app lock: resets on page load, re-locks when tab hidden ---
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => {
    function onVisibility() {
      if (document.hidden && appLock.enabled) setUnlocked(false);
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [appLock.enabled]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const top = byCat[0];
  const fmt = (v: number | string | undefined | null) => formatCurrency(v, profile.currency || 'INR');

  function saveExpense(x: Expense, repeat: string) {
    saveTrackedExpense(x, repeat, editing);
    setEditing(null);
    setTab('expenses');
  }
  function remove(id: string | undefined) {
    if (id) removeTrackedExpense(id);
  }
  // one-click re-log of a past entry
  function addQuickExpense(sugg: { description: string; category: string; amount: number; paymentMethod?: string }) {
    addTrackedQuickExpense(sugg);
  }
  function startAdd(presetDate?: string | null) {
    setEditing(null);
    setAddPresetDate(presetDate || null);
    setTab('add');
  }
  function startEdit(x: Expense) {
    setEditing(x);
    setAddPresetDate(null);
    setTab('add');
  }
  // calendar tap -> Add expense preset to that date
  function openDay(d: string) {
    startAdd(d);
  }
  function toggleRecurring(id: string) {
    toggleTrackedRecurring(id);
  }
  function deleteRecurring(id: string) {
    if (
      confirm(
        'Delete this recurring expense? Past expenses it already created will stay - this only stops future ones.',
      )
    )
      setRecurring((p) => p.filter((t: { id: string }) => t.id !== id));
  }
  function setCategoryBudget(id: string, value: string | number) {
    setTrackedCategoryBudget(id, value);
  }

  function exportCSV() {
    const rows = [
      ['Date', 'Amount', 'Category', 'Description', 'Payment Method', 'Note'],
      ...expenses.map((e) => [
        e.date,
        e.amount,
        categories.find((c) => c.id === e.category)?.name || '',
        e.description,
        e.paymentMethod,
        e.note || '',
      ]),
    ];
    const blob = new Blob(
      [
        rows
          .map((r) => r.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(','))
          .join('\n'),
      ],
      { type: 'text/csv' },
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'daily-expenses.csv';
    a.click();
  }
  function exportExcel() {
    const rows = toExpenseRows(expenses, categories);
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 28 }, { wch: 16 }, { wch: 24 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    XLSX.writeFile(wb, 'daily-expenses.xlsx');
  }
  // password-encrypted backup; only way to move data across a cleared browser/new device
  const [backupPassword, setBackupPassword] = useState(''),
    [restorePassword, setRestorePassword] = useState('');
  async function exportBackup() {
    if (backupPassword.length < 4)
      return alert(
        'Enter a backup password with at least 4 characters. You will need it again to restore this backup.',
      );
    const plain = buildBackupPayload({
      expenses,
      categories,
      budget,
      profile,
      categoryBudgets,
      recurring,
    });
    const envelope = await encryptBackupPayload(plain, backupPassword);
    const blob = new Blob([envelope], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'daily-expense-backup.json';
    a.click();
  }
  function importBackup(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      let text = String(reader.result || '');
      if (isEncryptedBackupText(text)) {
        if (!restorePassword) {
          alert('Enter the backup password first - this backup is encrypted.');
          e.target.value = '';
          return;
        }
        try {
          text = await decryptBackupPayload(text, restorePassword);
        } catch (err) {
          alert("Wrong password - that doesn't match this backup.");
          e.target.value = '';
          return;
        }
      }
      let data;
      try {
        data = parseBackupPayload(text);
      } catch (err) {
        alert("That doesn't look like a valid backup file.");
        e.target.value = '';
        return;
      }
      if (
        !confirm(
          'This replaces everything currently in the app with the backup data. This cannot be undone. Continue?',
        )
      ) {
        e.target.value = '';
        return;
      }
      setExpenses(data.expenses);
      setCategories(data.categories.length ? data.categories : defaultCategories);
      setBudget(data.budget);
      setCategoryBudgets(data.categoryBudgets || {});
      setRecurring(data.recurring || []);
      setProfile(data.profile);
      setRestorePassword('');
      alert('Restored from backup.');
    };
    reader.readAsText(file);
    e.target.value = '';
  }
  // CSV/Excel import via same xlsx lib used for export
  function importSpreadsheet(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let imported: Expense[] = [];
      let skipped = 0;
      try {
        const wb = XLSX.read(reader.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          raw: false,
          defval: '',
        });
        ({ imported, skipped } = normalizeImportedRows(rows, categories));
      } catch (err) {
        alert(
          'Could not read that file - make sure it\u2019s a .csv or .xlsx with a header row including at least Date and Amount.',
        );
        e.target.value = '';
        return;
      }
      if (!imported.length) {
        alert(
          skipped
            ? `All ${skipped} row(s) were skipped - check the Date and Amount columns.`
            : 'No rows were found in that file.',
        );
        e.target.value = '';
        return;
      }
      const proceed = confirm(
        `Import ${imported.length} expense${imported.length === 1 ? '' : 's'}?` +
          (skipped
            ? ` ${skipped} row(s) will be skipped due to a missing/invalid amount or date.`
            : '') +
          ' This adds to your existing expenses - nothing will be overwritten.',
      );
      if (proceed) {
        setExpenses((p) => [...imported, ...p]);
        alert(`Imported ${imported.length} expense${imported.length === 1 ? '' : 's'}.`);
      }
      e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  }

  if (loadError) return <main style={{ padding: 40 }}>{loadError}</main>;
  if (!loaded)
    return (
      <div className="app">
        <main style={{ padding: 40 }}>Loading your data…</main>
      </div>
    );

  if (appLock.enabled && !unlocked)
    return <LockScreen appLock={appLock} onUnlock={() => setUnlocked(true)} />;

  if (!onboardingDone) return <Onboarding onDone={() => setOnboardingDone(true)} />;

  return (
    <div className="app">
      <aside>
        <div className="brand">
          <span className="mark">💰</span>
          <span>DailyExpense</span>
        </div>
        <div className="nav">
          {(
            [
              ['dashboard', Home, 'Dashboard'],
              ['expenses', ListChecks, 'Expenses'],
              ['analytics', PieChartIcon, 'Analytics'],
              ['budget', Target, 'Budget'],
              ['categories', Tags, 'Categories'],
              ['profile', User, 'Profile'],
            ] as Array<[Exclude<TabKey, 'add'>, LucideIcon, string]>
          ).map(([key, Icon, label]) => (
            <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
              <Icon size={17} strokeWidth={2.2} />
              {label}
            </button>
          ))}
        </div>
      </aside>
      <main>
        <header>
          <div className="headerTitle">
            <div className="avatarPreview small">
              {profile.avatarImage ? (
                <img src={profile.avatarImage} alt="Profile" />
              ) : (
                <span>{profile.avatar || '🙂'}</span>
              )}
            </div>
            <div>
              <div className="eyebrow">PERSONAL FINANCE</div>
              <h1>
                {tab === 'dashboard'
                  ? profile.nickName
                    ? `Hi ${profile.nickName} 👋`
                    : 'Hi there! 👋'
                  : tab[0].toUpperCase() + tab.slice(1)}
              </h1>
              <p>Track everyday spending without the clutter.</p>
            </div>
          </div>
          <div className="headerActions">
            <button
              className="primary btnRow"
              aria-label="Open add expense form"
              onClick={() => startAdd()}
            >
              <Plus size={16} /> Add expense
            </button>
          </div>
        </header>

        {tab === 'dashboard' && (
          <>
            <section className="cards">
              <Metric title="Expenses" value={fmt(monthTotal)} highlight />
              <Metric
                title="Remaining balance"
                value={budget > 0 ? fmt(remaining) : '—'}
                highlight
                warn={budget > 0 && remaining < 0}
              />
              <Metric title="Income this month" value={fmt(monthIncomeTotal)} />
              <Metric title="Top category" value={top?.name || '—'} />
            </section>
            {budget <= 0 && (
              <p className="hint" style={{ marginTop: -10, marginBottom: 14 }}>
                <button className="mini" onClick={() => setTab('budget')}>
                  Set a monthly budget
                </button>{' '}
                to see your remaining balance.
              </p>
            )}
            {streaks.current >= 2 && (
              <div className="streakBadge">
                <Flame size={16} /> {streaks.current}-day logging streak
                {streaks.longest > streaks.current ? ` · best ${streaks.longest}` : ''}
              </div>
            )}
            {quickAdd.length > 0 && (
              <Panel title="Quick add">
                <div className="quickAddRow">
                  {quickAdd.map((q, i) => {
                    const c = categories.find((c) => c.id === q.category);
                    return (
                      <button
                        key={i}
                        className="quickChip"
                        onClick={() => addQuickExpense(q)}
                        aria-label={`Add ${q.description}, ${fmt(q.amount)}`}
                      >
                        <span className="quickChipName">
                          {c?.icon || '📦'} {q.description}
                        </span>
                        <span className="quickChipAmount">{fmt(q.amount)}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="hint">
                  Things you've logged more than once - click to add again with today's date.
                </p>
              </Panel>
            )}
            <div className="grid">
              <Panel title="Spending trend">
                {daily.length ? (
                  <Trend data={daily} currency={profile.currency || 'INR'} />
                ) : (
                  <EmptyState icon="📈" text="No spending yet this month." />
                )}
              </Panel>
              <Panel title="Category breakdown">
                {byCat.length ? (
                  <Donut data={byCat} currency={profile.currency || 'INR'} />
                ) : (
                  <EmptyState icon="📊" text="No spending yet this month." />
                )}
              </Panel>
            </div>
            <div className="grid">
              <Panel title="Calendar">
                <CalendarView
                  year={calYear}
                  month={calMonth}
                  spendByDay={spendByDay}
                  currency={profile.currency || 'INR'}
                  onSelectDay={openDay}
                  onPrev={() => {
                    if (calMonth === 0) {
                      setCalMonth(11);
                      setCalYear((y) => y - 1);
                    } else setCalMonth((m) => m - 1);
                  }}
                  onNext={() => {
                    if (calMonth === 11) {
                      setCalMonth(0);
                      setCalYear((y) => y + 1);
                    } else setCalMonth((m) => m + 1);
                  }}
                />
                <p className="hint">Tap any day to add an expense for that date.</p>
              </Panel>
              <Panel title="Recent expenses">
                {expenses.length ? (
                  <ExpenseList
                    items={expenses
                      .slice()
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .slice(0, 6)}
                    cats={categories}
                    currency={profile.currency || 'INR'}
                    onEdit={startEdit}
                    onDelete={remove}
                  />
                ) : (
                  <EmptyState
                    icon="🧾"
                    text="No expenses yet. Add your first one to see it here."
                    actionLabel={
                      <>
                        <Plus size={14} /> Add expense
                      </>
                    }
                    onAction={() => startAdd()}
                  />
                )}
              </Panel>
            </div>
          </>
        )}

        {tab === 'expenses' && (
          <Panel title="Expense history">
            <div className="toolbar" style={{ flexWrap: 'wrap', gap: '10px' }}>
              <div className="filterPills">
                <button
                  type="button"
                  className={typeFilter === 'all' ? 'active' : ''}
                  onClick={() => setTypeFilter('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  className={typeFilter === 'expense' ? 'active' : ''}
                  onClick={() => setTypeFilter('expense')}
                >
                  Expenses
                </button>
                <button
                  type="button"
                  className={typeFilter === 'income' ? 'active' : ''}
                  onClick={() => setTypeFilter('income')}
                >
                  Income
                </button>
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search description or note"
              />
              <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
              <label className="inlineDate">
                From
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </label>
              <label className="inlineDate">
                To
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </label>
              <label className="inlineDate">
                Min
                <input
                  type="number"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  placeholder="0"
                  style={{ width: 80 }}
                />
              </label>
              <label className="inlineDate">
                Max
                <input
                  type="number"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  placeholder="No limit"
                  style={{ width: 80 }}
                />
              </label>
              {dateFilterActive && (
                <button
                  className="mini"
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                    setAmountMin('');
                    setAmountMax('');
                    setTypeFilter('all');
                  }}
                >
                  Clear filters
                </button>
              )}
              {expenses.length > 0 && (
                <>
                  <button onClick={exportCSV}>Export CSV</button>
                  <button onClick={exportExcel}>Export Excel</button>
                </>
              )}
            </div>
            <div className="panelHead" style={{ marginTop: 8 }}>
              <span className="hint" style={{ margin: 0 }}>
                Showing {visible.length} transaction{visible.length === 1 ? '' : 's'} ·{' '}
                {fmt(total(visible))} total
              </span>
              {singleDaySelected && (
                <button className="primary mini btnRow" onClick={() => startAdd(singleDaySelected)}>
                  <Plus size={14} /> Add expense for this date
                </button>
              )}
            </div>
            {visible.length ? (
              <ExpenseList
                items={visible}
                cats={categories}
                currency={profile.currency || 'INR'}
                onEdit={startEdit}
                onDelete={remove}
              />
            ) : expenses.length ? (
              <EmptyState icon="🔍" text="No expenses match these filters." />
            ) : (
              <EmptyState
                icon="🧾"
                text="You haven't added any expenses yet."
                actionLabel={
                  <>
                    <Plus size={14} /> Add expense
                  </>
                }
                onAction={() => startAdd()}
              />
            )}
          </Panel>
        )}

        {tab === 'add' && (
          <ExpenseForm
            key={editing ? editing.id : 'new-' + (addPresetDate || '')}
            initial={editing}
            presetDate={addPresetDate}
            cats={categories}
            allExpenses={expenses}
            currency={profile.currency || 'INR'}
            onEditExpense={startEdit}
            onDeleteExpense={remove}
            onCancel={() => setTab('expenses')}
            onSave={saveExpense}
          />
        )}

        {tab === 'analytics' && (
          <>
            <Panel title="This month vs last month">
              <div className="budgetMeta">
                <b>This month</b>
                <span>{fmt(comparison.curTotal)}</span>
              </div>
              <div className="budgetMeta">
                <span className="hint" style={{ margin: 0 }}>
                  Last month
                </span>
                <span className="hint" style={{ margin: 0 }}>
                  {fmt(comparison.prevTotal)}
                </span>
              </div>
              {comparison.momPct === null ? (
                <p className="hint">Not enough history yet to compare to last month.</p>
              ) : (
                <p
                  className={
                    'hint compareLine' +
                    (comparison.momPct > 0 ? ' up' : comparison.momPct < 0 ? ' down' : '')
                  }
                >
                  {comparison.momPct > 0 ? (
                    <TrendingUp size={14} />
                  ) : comparison.momPct < 0 ? (
                    <TrendingDown size={14} />
                  ) : null}{' '}
                  {Math.abs(comparison.momPct).toFixed(0)}% vs last month
                </p>
              )}
              {comparison.yoyPct !== null && (
                <p
                  className={
                    'hint compareLine' +
                    (comparison.yoyPct > 0 ? ' up' : comparison.yoyPct < 0 ? ' down' : '')
                  }
                >
                  {comparison.yoyPct > 0 ? (
                    <TrendingUp size={14} />
                  ) : comparison.yoyPct < 0 ? (
                    <TrendingDown size={14} />
                  ) : null}{' '}
                  {Math.abs(comparison.yoyPct).toFixed(0)}% vs{' '}
                  {monthNames[Number(comparison.lastYearMonth.slice(5, 7)) - 1]} last year
                </p>
              )}
            </Panel>
            <div className="grid">
              <Panel title="Category spending">
                {byCat.length ? (
                  <Donut data={byCat} currency={profile.currency || 'INR'} />
                ) : (
                  <EmptyState
                    icon="📊"
                    text="No spending yet this month. Add an expense to see the breakdown."
                  />
                )}
              </Panel>
              <Panel title="Daily spending">
                {daily.length ? (
                  <Trend data={daily} currency={profile.currency || 'INR'} />
                ) : (
                  <EmptyState icon="📅" text="No spending yet this month." />
                )}
              </Panel>
            </div>
            <Panel title="Monthly overview (income vs expense)">
              <MonthlyBars
                expenses={expenses}
                categories={categories}
                currency={profile.currency || 'INR'}
              />
            </Panel>
          </>
        )}

        {tab === 'budget' && (
          <>
            <Budget
              budget={budget}
              setBudget={setBudget}
              spent={monthTotal}
              currency={profile.currency || 'INR'}
            />
            <Panel title="Category budgets">
              <p className="hint" style={{ margin: '0 0 14px' }}>
                Set a monthly limit for individual categories, in addition to your overall budget
                above.
              </p>
              {categories
                .filter((c) => !c.income)
                .map((c) => {
                  const catBudget = categoryBudgets[c.id] || 0;
                  const catSpent = categorySpend[c.id] || 0;
                  const catPct = catBudget > 0 ? Math.min(100, (catSpent / catBudget) * 100) : 0;
                  return (
                    <div key={c.id} style={{ marginBottom: 16 }}>
                      <div className="budgetMeta">
                        <b>
                          {c.icon} {c.name}
                        </b>
                        <input
                          className="budgetInput small"
                          type="number"
                          placeholder="No limit"
                          value={catBudget || ''}
                          onChange={(e) => setCategoryBudget(c.id, e.target.value)}
                        />
                      </div>
                      {catBudget > 0 && (
                        <>
                          <div className={'progress' + (catPct >= 80 ? ' warn' : '')}>
                            <i style={{ width: catPct + '%' }} />
                          </div>
                          <p className="hint">
                            {fmt(catSpent)} of {fmt(catBudget)} spent this month
                          </p>
                        </>
                      )}
                    </div>
                  );
                })}
            </Panel>
            <Panel title="Recurring expenses">
              {recurring.length ? (
                <div>
                  {recurring.map((t) => {
                    const c = categories.find((c) => c.id === t.category);
                    return (
                      <div className="expense" key={t.id}>
                        <span className="icon">{c?.icon || '📦'}</span>
                        <div className="grow">
                          <b>{t.description}</b>
                          <small>
                            {frequencyLabels[t.frequency]} · {formatINR(t.amount)}
                            {!t.active ? ' · Paused' : ''}
                          </small>
                        </div>
                        <button className="mini" onClick={() => toggleRecurring(t.id)}>
                          {t.active ? 'Pause' : 'Resume'}
                        </button>
                        <button className="mini danger" onClick={() => deleteRecurring(t.id)}>
                          Delete
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon="🔁"
                  text="No recurring expenses yet. Add one from the Add expense screen using the Repeat option."
                  actionLabel={
                    <>
                      <Plus size={14} /> Add expense
                    </>
                  }
                  onAction={() => startAdd()}
                />
              )}
            </Panel>
          </>
        )}
        {tab === 'categories' && (
          <CategoryManager cats={categories} setCats={setCategories} expenses={expenses} />
        )}
        {tab === 'profile' && (
          <>
            <Profile profile={profile} setProfile={setProfile} />
            <Panel title="Appearance">
              <div className="themeToggle">
                <button
                  className={theme === 'light' ? 'active' : ''}
                  onClick={() => setTheme('light')}
                >
                  ☀ Light
                </button>
                <button
                  className={theme === 'dark' ? 'active' : ''}
                  onClick={() => setTheme('dark')}
                >
                  🌙 Dark
                </button>
              </div>
            </Panel>
            <AppLockPanel
              appLock={appLock}
              setAppLock={setAppLock}
              onUnlockNow={() => setUnlocked(true)}
            />
            <Panel title="Import from spreadsheet">
              <p className="hint" style={{ margin: '0 0 14px' }}>
                Migrating from a spreadsheet? Upload a .csv or .xlsx file with Date, Amount,
                Category, Description, Payment Method, and Note columns (column order doesn't
                matter, and Category is matched by name).
              </p>
              <label className="mini fileBtn btnRow">
                <Upload size={14} /> Choose file to import
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={importSpreadsheet}
                />
              </label>
            </Panel>
            <Panel title="Backup & restore">
              <p className="hint" style={{ margin: '0 0 14px' }}>
                This app keeps everything private in your browser only - there's no account or cloud
                sync. That means clearing browser data (or reinstalling on mobile) can erase your
                data. Export a backup first, then restore it here whenever you need to bring your
                data back.
              </p>
              <label className="wide">
                Backup password
                <input
                  type="password"
                  value={backupPassword}
                  onChange={(e) => setBackupPassword(e.target.value)}
                  placeholder="At least 4 characters"
                />
              </label>
              <p className="hint">
                Your backup file is encrypted with this password. Daily Expense Tracker never stores
                it anywhere, so if you forget it, the backup can't be recovered - keep it somewhere
                safe.
              </p>
              <div className="toolbar">
                <button className="primary btnRow" onClick={exportBackup}>
                  <Download size={16} /> Export backup
                </button>
              </div>
              <label className="wide" style={{ marginTop: 16 }}>
                Backup password (to restore)
                <input
                  type="password"
                  value={restorePassword}
                  onChange={(e) => setRestorePassword(e.target.value)}
                  placeholder="Needed only if the backup is encrypted"
                />
              </label>
              <div className="toolbar">
                <label className="mini fileBtn btnRow">
                  <Upload size={14} /> Restore from file
                  <input
                    type="file"
                    accept="application/json"
                    style={{ display: 'none' }}
                    onChange={importBackup}
                  />
                </label>
              </div>
            </Panel>
          </>
        )}
      </main>
      {undoState && (
        <div className="snackbar">
          <span>{undoState.message}</span>
          <button className="mini" onClick={undoLast}>
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
