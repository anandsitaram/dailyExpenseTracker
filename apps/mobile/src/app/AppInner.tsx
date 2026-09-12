import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  AppState,
} from 'react-native';
import {
  RNFS,
  Share,
  XLSX,
  secureGetItem,
  secureSetItem,
  encryptBackupPayload,
  decryptBackupPayload,
  isBiometrySupported,
  enableBiometricUnlock,
  disableBiometricUnlock,
} from '../services/index.js';
import {
  defaultCategories,
  paymentMethods,
  avatarChoices,
  formatCurrency,
  formatINR,
  monthNames,
  toExpenseRows,
  buildBackupPayload,
  parseBackupPayload,
  isEncryptedBackupText,
  defaultAppLock,
  isValidPin,
  recurringFrequencies,
  frequencyLabels,
  normalizeImportedRows,
  todayDateKey,
  supportedCurrencies,
  total,
} from '../../../core/src/index.js';
import { useExpenseTracker } from '../../../core/src/useExpenseTracker.js';
import {
  Home,
  ListChecks,
  Plus,
  PieChart,
  Target,
  Tags,
  User,
  X,
  Download,
  Upload,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react';
import {
  Section,
  Stat,
  EmptyState,
  Row,
  MonthlyOverview,
  Calendar,
  LockScreen,
  PinSetupForm,
  Onboarding,
} from '../components/index.js';
import s, { DARK } from '../styles/styles.js';
import { Expense } from '../../../core/src/types.js';
const today = todayDateKey;
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
function AppInner() {
  const {
    expenses,
    setExpenses,
    categories: cats,
    setCategories: setCats,
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
    monthExpenseItems,
    monthTotal: spent,
    monthIncomeTotal: income,
    byCat,
    categorySpend,
    spendByDay,
    visibleExpenses,
    dateFilterActive,
    singleDaySelected,
    quickAdd,
    streaks,
    comparison,
    undoState: snackbar,
    undoLast: dismissSnackbarAndUndo,
    saveExpense: saveTrackedExpense,
    removeExpense: removeTrackedExpense,
    addQuickExpense: addTrackedQuickExpense,
    toggleRecurring: toggleTrackedRecurring,
    setCategoryBudget: setTrackedCategoryBudget,
  } = useExpenseTracker({ storage: { get: secureGetItem, set: secureSetItem } });
  const [tab, setTab] = useState<string>('home');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState(''),
    [desc, setDesc] = useState(''),
    [category, setCategory] = useState('food'),
    [method, setMethod] = useState('UPI'),
    [date, setDate] = useState(today()),
    [note, setNote] = useState(''),
    [repeat, setRepeat] = useState('none');
  const [newCat, setNewCat] = useState(''),
    [newCatIcon, setNewCatIcon] = useState(CATEGORY_ICON_CHOICES[0]);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [restoreText, setRestoreText] = useState(''),
    [backupPassword, setBackupPassword] = useState(''),
    [restorePassword, setRestorePassword] = useState('');
  const [importText, setImportText] = useState('');
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear()),
    [calMonth, setCalMonth] = useState(now.getMonth());

  // --- app lock (session-only, resets on cold start) ---
  const [unlocked, setUnlocked] = useState(false);
  const [biometrySupported, setBiometrySupported] = useState(false);
  useEffect(() => {
    isBiometrySupported().then(setBiometrySupported);
  }, []);
  // re-lock on backgrounding, not just cold start
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && appLock.enabled) setUnlocked(false);
    });
    return () => sub.remove();
  }, [appLock.enabled]);

  const remaining = budget - spent;
  const fmt = (v: number | string | undefined | null) => formatCurrency(v, profile.currency || 'INR');
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  // same-day expenses shown under Add-expense form
  const sameDayExpenses = useMemo(
    () =>
      expenses
        .filter((e) => e.date === date && e.id !== editingId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [expenses, date, editingId],
  );
  // per-category spend for Budget tab progress bars

  function resetForm(presetDate?: string | null) {
    setEditingId(null);
    setAmount('');
    setDesc('');
    setCategory(cats.find((c) => !c.income)?.id || cats[0]?.id || 'food');
    setMethod('UPI');
    setDate(presetDate || today());
    setNote('');
    setRepeat('none');
  }
  function startEdit(e: Expense) {
    setEditingId(e.id ?? null);
    setAmount(String(e.amount));
    setDesc(e.description || '');
    setCategory(e.category);
    setMethod(e.paymentMethod || 'UPI');
    setDate(e.date);
    setNote(e.note || '');
    setRepeat('none');
    setTab('add');
  }
  function startAdd(presetDate?: string | null) {
    resetForm(presetDate);
    setTab('add');
  }
  // calendar tap -> Add expense preset to that date
  function openDay(d: string) {
    startAdd(d);
  }
  function save() {
    if (!Number(amount)) return Alert.alert('Enter amount');
    saveTrackedExpense(
      {
        id: editingId || Date.now().toString(),
        amount: Number(amount),
        description: desc || cats.find((c) => c.id === category)?.name,
        date,
        category,
        paymentMethod: method,
        note,
      },
      repeat,
      editingId ? { id: editingId } : null,
    );
    resetForm();
    setTab('expenses');
  }
  function removeExpense(id: string | undefined) {
    if (id) removeTrackedExpense(id);
  }
  // one-tap re-log of a past entry
  function addQuickExpense(sugg: {
    description: string;
    category: string;
    amount: number;
    paymentMethod?: string;
  }) {
    addTrackedQuickExpense(sugg);
  }
  function addCategory() {
    if (!newCat.trim()) return;
    setCats([...cats, { id: 'custom-' + Date.now(), name: newCat.trim(), icon: newCatIcon }]);
    setNewCat('');
    setNewCatIcon(CATEGORY_ICON_CHOICES[0]);
  }
  function removeCategory(id: string) {
    const count = expenses.filter((e) => e.category === id).length;
    const proceed = () => {
      setCats(cats.filter((c) => c.id !== id));
      setCategoryBudgets((b) => {
        const n = { ...b };
        delete n[id];
        return n;
      });
    };
    if (count > 0) {
      Alert.alert(
        'Delete this category?',
        `This category is used by ${count} expense${count === 1 ? '' : 's'}. Deleting it won't delete those expenses, but they'll show as "Uncategorized".`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: proceed },
        ],
      );
    } else {
      proceed();
    }
  }
  function toggleRecurring(id: string) {
    toggleTrackedRecurring(id);
  }
  function deleteRecurring(id: string) {
    Alert.alert(
      'Delete recurring expense',
      'Past expenses it already created will stay - this only stops future ones.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => setRecurring(recurring.filter((t) => t.id !== id)),
        },
      ],
    );
  }
  function setCategoryBudget(id: string, value: string | number) {
    setTrackedCategoryBudget(id, value);
  }
  async function exportExcel() {
    const rows = toExpenseRows(expenses, cats);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const path = RNFS.DocumentDirectoryPath + '/daily-expenses.xlsx';
    await RNFS.writeFile(path, wbout, 'base64');
    try {
      await Share.open({
        url: 'file://' + path,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        title: 'Export expenses',
        failOnCancel: false,
      });
    } catch (e) {
      Alert.alert('Saved to', path);
    }
  }
  // password-encrypted backup; only way to move data across reinstall/new phone
  async function exportBackup() {
    if (backupPassword.length < 4)
      return Alert.alert(
        'Set a backup password',
        'Enter a password with at least 4 characters. You will need it again to restore this backup.',
      );
    const plain = buildBackupPayload({
      expenses,
      categories: cats,
      budget,
      profile,
      categoryBudgets,
      recurring,
    });
    const envelope = encryptBackupPayload(plain, backupPassword);
    const path = RNFS.DocumentDirectoryPath + '/daily-expense-backup.json';
    await RNFS.writeFile(path, envelope, 'utf8');
    try {
      await Share.open({
        url: 'file://' + path,
        type: 'application/json',
        title: 'Save your backup',
        failOnCancel: false,
      });
    } catch (e) {
      Alert.alert('Backup saved to', path);
    }
  }
  function restoreBackup() {
    if (!restoreText.trim())
      return Alert.alert(
        'Paste your backup first',
        'Open your saved backup file, copy all of its text, then paste it here.',
      );
    let plainText = restoreText;
    if (isEncryptedBackupText(restoreText)) {
      if (!restorePassword)
        return Alert.alert(
          'Enter the backup password',
          'This backup is encrypted - enter the password you used when you exported it.',
        );
      try {
        plainText = decryptBackupPayload(restoreText, restorePassword);
      } catch (e) {
        return Alert.alert(
          'Wrong password',
          'That password doesn\u2019t match this backup. Please try again.',
        );
      }
    }
    let data;
    try {
      data = parseBackupPayload(plainText);
    } catch (e) {
      return Alert.alert(
        "That doesn't look like a valid backup",
        'Please check you copied the whole file and try again.',
      );
    }
    Alert.alert(
      'Restore this backup?',
      'This replaces everything currently in the app with the backup data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: () => {
            setExpenses(data.expenses);
            setCats(data.categories.length ? data.categories : defaultCategories);
            setBudget(data.budget);
            setCategoryBudgets(data.categoryBudgets || {});
            setRecurring(data.recurring || []);
            setProfile(data.profile);
            setRestoreText('');
            setRestorePassword('');
            Alert.alert('Restored', 'Your data has been restored from the backup.');
          },
        },
      ],
    );
  }
  // CSV import via paste (no document picker installed); xlsx parses raw CSV text
  function importCSV() {
    if (!importText.trim())
      return Alert.alert(
        'Paste CSV first',
        'Copy your spreadsheet as CSV text (e.g. from Excel or Google Sheets) and paste it here.',
      );
    let imported: Expense[] = [];
    let skipped = 0;
    try {
      const wb = XLSX.read(importText, { type: 'string' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { raw: false, defval: '' });
      ({ imported, skipped } = normalizeImportedRows(rows, cats));
    } catch (e) {
      return Alert.alert(
        'Could not read that',
        'Make sure you pasted valid CSV text, with a header row including at least Date and Amount.',
      );
    }
    if (!imported.length)
      return Alert.alert(
        'Nothing to import',
        skipped
          ? `All ${skipped} row(s) were skipped - check the Date and Amount columns.`
          : 'No rows were found in that text.',
      );
    Alert.alert(
      `Import ${imported.length} expense${imported.length === 1 ? '' : 's'}?`,
      skipped
        ? `${skipped} row(s) will be skipped due to a missing or invalid amount/date. This adds to your existing expenses - nothing will be overwritten.`
        : 'This adds to your existing expenses - nothing will be overwritten.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: () => {
            setExpenses((prev) => [...imported, ...prev]);
            setImportText('');
            Alert.alert(
              'Imported',
              `Added ${imported.length} expense${imported.length === 1 ? '' : 's'}.`,
            );
          },
        },
      ],
    );
  }

  // --- app lock setup (Profile tab) ---
  const [pinDraft, setPinDraft] = useState(''),
    [pinConfirm, setPinConfirm] = useState(''),
    [showPinSetup, setShowPinSetup] = useState(false);
  async function savePin() {
    if (!isValidPin(pinDraft)) return Alert.alert('Use a 4-6 digit PIN');
    if (pinDraft !== pinConfirm) return Alert.alert("PINs don't match");
    const useBiometric = biometrySupported && appLock.mode === 'biometric';
    if (useBiometric) await enableBiometricUnlock();
    setAppLock({ enabled: true, mode: useBiometric ? 'biometric' : 'pin', pin: pinDraft });
    setPinDraft('');
    setPinConfirm('');
    setShowPinSetup(false);
  }
  async function toggleBiometricMode(on: boolean) {
    if (on) {
      await enableBiometricUnlock();
      setAppLock({ ...appLock, mode: 'biometric' });
    } else {
      await disableBiometricUnlock();
      setAppLock({ ...appLock, mode: 'pin' });
    }
  }
  async function turnOffLock() {
    await disableBiometricUnlock();
    setAppLock(defaultAppLock);
    setUnlocked(true);
  }

  const Nav = () => (
    <View style={s.nav}>
      {(
        [
          ['home', Home, 'Home'],
          ['expenses', ListChecks, 'Expenses'],
          ['add', Plus, 'Add'],
          ['analytics', PieChart, 'Analytics'],
          ['budget', Target, 'Budget'],
          ['categories', Tags, 'Categories'],
          ['profile', User, 'Profile'],
        ] as [string, LucideIcon, string][]
      ).map(([key, Icon, label]) => (
        <TouchableOpacity
          key={key}
          onPress={() => (key === 'add' ? startAdd() : setTab(key))}
          style={s.navItem}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === key }}
          accessibilityLabel={label}
        >
          <Icon
            size={19}
            color={tab === key ? DARK : '#5b645b'}
            strokeWidth={tab === key ? 2.3 : 2}
          />
          <Text
            style={tab === key ? s.navTextActive : s.navText}
            maxFontSizeMultiplier={1.3}
            numberOfLines={1}
          >
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loadError)
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingWrap}>
          <Text style={s.muted}>{loadError}</Text>
        </View>
      </SafeAreaView>
    );
  if (!loaded)
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingWrap}>
          <Text style={s.muted}>Loading your data…</Text>
        </View>
      </SafeAreaView>
    );

  if (appLock.enabled && !unlocked) {
    return <LockScreen appLock={appLock} onUnlock={() => setUnlocked(true)} />;
  }

  if (!onboardingDone) {
    return <Onboarding onDone={() => setOnboardingDone(true)} />;
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.container}>
        {tab === 'home' && (
          <>
            <View style={s.greetRow}>
              <View style={s.avatarCircle}>
                <Text style={s.avatarEmoji}>{profile.avatar || '🙂'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>
                  {profile.nickName ? `Hi ${profile.nickName} 👋` : 'Hi there! 👋'}
                </Text>
                <Text style={s.muted}>Personal spending dashboard</Text>
              </View>
            </View>
            <View style={s.hero}>
              <View style={s.heroRow}>
                <View style={s.heroCol}>
                  <Text style={s.mutedLight}>Expenses</Text>
                  <Text style={s.total}>{fmt(spent)}</Text>
                </View>
                <View style={s.heroDivider} />
                <View style={s.heroCol}>
                  <Text style={s.mutedLight}>Remaining balance</Text>
                  <Text style={[s.total, budget > 0 && remaining < 0 && s.totalWarn]}>
                    {budget > 0 ? fmt(remaining) : '—'}
                  </Text>
                </View>
              </View>
              <Text style={s.mutedLight}>
                {month.length} transaction{month.length === 1 ? '' : 's'} this month
              </Text>
              {budget <= 0 && (
                <TouchableOpacity onPress={() => setTab('budget')}>
                  <Text style={s.heroHint}>
                    Set a monthly budget to see your remaining balance →
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={s.two}>
              <Stat t="Income this month" v={fmt(income)} />
              <Stat t="Top category" v={byCat[0]?.name || '—'} />
            </View>
            {streaks.current >= 2 && (
              <View style={s.streakBadge}>
                <Text style={s.streakText}>
                  🔥 {streaks.current}-day logging streak
                  {streaks.longest > streaks.current ? ` · best ${streaks.longest}` : ''}
                </Text>
              </View>
            )}
            {quickAdd.length > 0 && (
              <Section title="Quick add">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {quickAdd.map((q, i) => {
                    const c = cats.find((c) => c.id === q.category);
                    return (
                      <TouchableOpacity
                        key={i}
                        onPress={() => addQuickExpense(q)}
                        style={s.quickChip}
                        accessibilityRole="button"
                        accessibilityLabel={`Add ${q.description}, ${fmt(q.amount)}`}
                      >
                        <Text style={s.quickChipName} numberOfLines={1}>
                          {c?.icon || '📦'} {q.description}
                        </Text>
                        <Text style={s.quickChipAmount}>{fmt(q.amount)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <Text style={s.hint}>
                  Things you&apos;ve logged more than once - tap to add again with today&apos;s
                  date.
                </Text>
              </Section>
            )}
            <Section title="Calendar">
              <Calendar
                year={calYear}
                month={calMonth}
                spendByDay={spendByDay}
                currency={profile.currency || 'INR'}
                onSelectDay={openDay}
                onPrev={() => {
                  if (calMonth === 0) {
                    setCalMonth(11);
                    setCalYear(calYear - 1);
                  } else setCalMonth(calMonth - 1);
                }}
                onNext={() => {
                  if (calMonth === 11) {
                    setCalMonth(0);
                    setCalYear(calYear + 1);
                  } else setCalMonth(calMonth + 1);
                }}
              />
              <Text style={s.hint}>Tap any day to add an expense for that date.</Text>
            </Section>
            <Section title="Recent expenses">
              {expenses.length ? (
                expenses
                  .slice()
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 6)
                  .map((e) => (
                    <Row
                      key={e.id}
                      e={e}
                      cats={cats}
                      currency={profile.currency || 'INR'}
                      onEdit={startEdit}
                      onDelete={removeExpense}
                    />
                  ))
              ) : (
                <EmptyState
                  icon="🧾"
                  text="No expenses yet. Tap the + tab below to add your first one."
                  actionLabel="Add an expense"
                  onAction={() => startAdd()}
                />
              )}
            </Section>
          </>
        )}

        {tab === 'expenses' && (
          <Section title="Expense history">
            <View style={{ flexDirection: 'row', marginBottom: 10 }}>
              <TouchableOpacity
                onPress={() => setTypeFilter('all')}
                style={[s.pill, typeFilter === 'all' && s.pillActive]}
              >
                <Text style={typeFilter === 'all' ? s.pillTextActive : s.pillText}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTypeFilter('expense')}
                style={[s.pill, typeFilter === 'expense' && s.pillActive]}
              >
                <Text style={typeFilter === 'expense' ? s.pillTextActive : s.pillText}>
                  Expenses
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTypeFilter('income')}
                style={[s.pill, typeFilter === 'income' && s.pillActive]}
              >
                <Text style={typeFilter === 'income' ? s.pillTextActive : s.pillText}>Income</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={s.input}
              placeholder="Search description or note"
              value={search}
              onChangeText={setSearch}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[{ id: 'all', name: 'All categories', icon: '' }, ...cats].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setFilter(item.id)}
                  style={[s.chip, filter === item.id && s.selected]}
                >
                  <Text style={s.chipText}>
                    {item.icon} {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={s.dateToggle}
              onPress={() => setShowDateFilter(!showDateFilter)}
            >
              <Text style={s.linkBtn}>
                {showDateFilter ? 'Hide filters' : 'Filter by date or amount'}
              </Text>
            </TouchableOpacity>
            {showDateFilter && (
              <View style={s.rowInline}>
                <View style={{ flex: 1 }}>
                  <Text style={s.smallLabel}>From (YYYY-MM-DD)</Text>
                  <TextInput
                    style={s.input}
                    value={dateFrom}
                    onChangeText={setDateFrom}
                    placeholder="2026-09-01"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.smallLabel}>To (YYYY-MM-DD)</Text>
                  <TextInput
                    style={s.input}
                    value={dateTo}
                    onChangeText={setDateTo}
                    placeholder="2026-09-30"
                  />
                </View>
              </View>
            )}
            {showDateFilter && (
              <View style={s.rowInline}>
                <View style={{ flex: 1 }}>
                  <Text style={s.smallLabel}>Min amount</Text>
                  <TextInput
                    style={s.input}
                    keyboardType="numeric"
                    value={amountMin}
                    onChangeText={setAmountMin}
                    placeholder="0"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.smallLabel}>Max amount</Text>
                  <TextInput
                    style={s.input}
                    keyboardType="numeric"
                    value={amountMax}
                    onChangeText={setAmountMax}
                    placeholder="No limit"
                  />
                </View>
              </View>
            )}
            {dateFilterActive && (
              <TouchableOpacity
                onPress={() => {
                  setDateFrom('');
                  setDateTo('');
                  setAmountMin('');
                  setAmountMax('');
                  setTypeFilter('all');
                }}
              >
                <Text style={s.danger}>Clear filters</Text>
              </TouchableOpacity>
            )}
            <Text style={[s.hint, { marginTop: 4, marginBottom: 8 }]}>
              Showing {visibleExpenses.length} transaction{visibleExpenses.length === 1 ? '' : 's'}{' '}
              · {fmt(total(visibleExpenses))} total
            </Text>
            {singleDaySelected && (
              <TouchableOpacity
                style={[s.secondary, s.btnRow]}
                onPress={() => startAdd(singleDaySelected)}
              >
                <Plus size={16} color="#33500f" />
                <Text style={s.secondaryText}>Add expense for {singleDaySelected}</Text>
              </TouchableOpacity>
            )}
            {expenses.length > 0 && (
              <TouchableOpacity style={s.secondary} onPress={exportExcel}>
                <Text style={s.secondaryText}>Export to Excel</Text>
              </TouchableOpacity>
            )}
            {visibleExpenses.map((e) => (
              <Row
                key={e.id}
                e={e}
                cats={cats}
                currency={profile.currency || 'INR'}
                onEdit={startEdit}
                onDelete={removeExpense}
              />
            ))}
            {!visibleExpenses.length &&
              (expenses.length ? (
                <EmptyState icon="🔍" text="No expenses match these filters." />
              ) : (
                <EmptyState
                  icon="🧾"
                  text="You haven't added any expenses yet."
                  actionLabel="Add an expense"
                  onAction={() => startAdd()}
                />
              ))}
          </Section>
        )}

        {tab === 'add' && (
          <>
            <Section title={editingId ? 'Edit expense' : 'Add expense'}>
              <Text style={s.label}>Amount</Text>
              <TextInput
                style={s.input}
                keyboardType="numeric"
                placeholder="₹ 0"
                value={amount}
                onChangeText={setAmount}
              />
              <Text style={s.label}>Description</Text>
              <TextInput
                style={s.input}
                placeholder="What did you spend on?"
                value={desc}
                onChangeText={setDesc}
              />
              <Text style={s.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {cats.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setCategory(c.id)}
                    style={[s.chip, category === c.id && s.selected]}
                  >
                    <Text style={s.chipText}>
                      {c.icon} {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={s.label}>Payment method</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {paymentMethods.map((x) => (
                  <TouchableOpacity
                    key={x}
                    onPress={() => setMethod(x)}
                    style={[s.chip, method === x && s.selected]}
                  >
                    <Text style={s.chipText}>{x}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={s.label}>Date (YYYY-MM-DD)</Text>
              <TextInput style={s.input} value={date} onChangeText={setDate} />
              {!editingId && (
                <>
                  <Text style={s.label}>Repeat</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {['none', ...recurringFrequencies].map((f) => (
                      <TouchableOpacity
                        key={f}
                        onPress={() => setRepeat(f)}
                        style={[s.chip, repeat === f && s.selected]}
                      >
                        <Text style={s.chipText}>
                          {f === 'none' ? 'One-time' : frequencyLabels[f]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {repeat !== 'none' && (
                    <Text style={s.hint}>
                      This will create a recurring {frequencyLabels[repeat].toLowerCase()} expense
                      starting {date}, and catch up on any occurrences automatically whenever you
                      open the app.
                    </Text>
                  )}
                </>
              )}
              <Text style={s.label}>Notes</Text>
              <TextInput
                style={s.input}
                value={note}
                onChangeText={setNote}
                placeholder="Optional note"
              />
              <TouchableOpacity style={s.primary} onPress={save}>
                <Text style={s.primaryText}>
                  {editingId
                    ? 'Save changes'
                    : repeat !== 'none'
                      ? 'Add recurring expense'
                      : 'Add expense'}
                </Text>
              </TouchableOpacity>
              {editingId && (
                <TouchableOpacity
                  style={s.cancel}
                  onPress={() => {
                    resetForm();
                    setTab('expenses');
                  }}
                >
                  <Text style={s.cancelText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </Section>
            {sameDayExpenses.length > 0 && (
              <Section title={`Other expenses on ${date}`}>
                {sameDayExpenses.map((e) => (
                  <Row key={e.id} e={e} cats={cats} onEdit={startEdit} onDelete={removeExpense} />
                ))}
              </Section>
            )}
          </>
        )}

        {tab === 'analytics' && (
          <>
            <Section title="This month vs last month">
              <View style={s.rowTop}>
                <Text style={s.bold}>This month</Text>
                <Text style={s.bold}>{fmt(comparison.curTotal)}</Text>
              </View>
              <View style={s.rowTop}>
                <Text style={s.muted}>Last month</Text>
                <Text style={s.muted}>{fmt(comparison.prevTotal)}</Text>
              </View>
              {comparison.momPct === null ? (
                <Text style={s.hint}>Not enough history yet to compare to last month.</Text>
              ) : (
                <Text
                  style={[
                    s.hint,
                    comparison.momPct > 0 ? s.danger : comparison.momPct < 0 ? s.positive : null,
                  ]}
                >
                  {comparison.momPct > 0 ? '▲' : comparison.momPct < 0 ? '▼' : '—'}{' '}
                  {Math.abs(comparison.momPct).toFixed(0)}% vs last month
                </Text>
              )}
              {comparison.yoyPct !== null && (
                <Text style={s.hint}>
                  {comparison.yoyPct > 0 ? '▲' : comparison.yoyPct < 0 ? '▼' : '—'}{' '}
                  {Math.abs(comparison.yoyPct).toFixed(0)}% vs{' '}
                  {monthNames[Number(comparison.lastYearMonth.slice(5, 7)) - 1]} last year
                </Text>
              )}
            </Section>
            <Section title="Category spending">
              {byCat.length ? (
                byCat.map((c) => (
                  <View style={s.metric} key={c.id}>
                    <View style={s.rowTop}>
                      <Text style={s.bold}>
                        {c.icon} {c.name}
                      </Text>
                      <Text style={s.bold}>{fmt(c.value)}</Text>
                    </View>
                    <View style={s.track}>
                      <View
                        style={[
                          s.fill,
                          { width: `${spent ? (c.value / spent) * 100 : 0}%` },
                        ]}
                      />
                    </View>
                  </View>
                ))
              ) : (
                <EmptyState
                  icon="📊"
                  text="No spending yet this month. Add an expense to see the breakdown."
                />
              )}
            </Section>
            <Section title="Daily spending">
              {Object.keys(
                monthExpenseItems.reduce((m: Record<string, number>, e) => ((m[e.date] = 1), m), {}),
              ).length ? (
                Object.entries(
                  monthExpenseItems.reduce(
                    (m: Record<string, number>, e) => ((m[e.date] = (m[e.date] || 0) + Number(e.amount)), m),
                    {},
                  ),
                )
                  .sort()
                  .map(([d, v]) => (
                    <View style={s.rowTop} key={d}>
                      <Text style={s.bold}>{d}</Text>
                      <Text style={s.bold}>{fmt(v)}</Text>
                    </View>
                  ))
              ) : (
                <EmptyState icon="📅" text="No spending yet this month." />
              )}
            </Section>
            <Section title="Monthly overview (income vs expense)">
              <MonthlyOverview
                expenses={expenses}
                cats={cats}
                currency={profile.currency || 'INR'}
              />
            </Section>
          </>
        )}

        {tab === 'budget' && (
          <>
            <Section title="Monthly budget">
              <Text style={s.muted}>Spent</Text>
              <Text style={s.big}>{fmt(spent)}</Text>
              <Text style={s.muted}>Budget</Text>
              <TextInput
                style={s.input}
                keyboardType="numeric"
                placeholder="Enter your monthly budget"
                value={budget ? String(budget) : ''}
                onChangeText={(x) => setBudget(Number(x) || 0)}
              />
              {budget > 0 ? (
                <>
                  <View style={s.track}>
                    <View style={[s.fill, pct >= 80 && s.fillWarn, { width: `${pct}%` }]} />
                  </View>
                  <View style={s.rowTop}>
                    <Text style={s.bold}>{pct.toFixed(0)}% used</Text>
                    <Text style={s.bold}>{fmt(Math.max(0, budget - spent))} remaining</Text>
                  </View>
                  {pct >= 80 && (
                    <Text style={s.alert}>⚠️ You are approaching your monthly budget.</Text>
                  )}
                </>
              ) : (
                <Text style={s.hint}>Set a budget above to track your spending against it.</Text>
              )}
            </Section>
            <Section title="Category budgets">
              <Text style={s.hint}>
                Set a monthly limit for individual categories, in addition to your overall budget
                above.
              </Text>
              {cats
                .filter((c) => !c.income)
                .map((c) => {
                  const catBudget = categoryBudgets[c.id] || 0;
                  const catSpent = categorySpend[c.id] || 0;
                  const catPct = catBudget > 0 ? Math.min(100, (catSpent / catBudget) * 100) : 0;
                  return (
                    <View key={c.id} style={{ marginTop: 14 }}>
                      <View style={s.rowTop}>
                        <Text style={s.bold}>
                          {c.icon} {c.name}
                        </Text>
                        <TextInput
                          style={s.catBudgetInput}
                          keyboardType="numeric"
                          placeholder="No limit"
                          value={catBudget ? String(catBudget) : ''}
                          onChangeText={(v) => setCategoryBudget(c.id, v)}
                        />
                      </View>
                      {catBudget > 0 && (
                        <>
                          <View style={s.track}>
                            <View
                              style={[
                                s.fill,
                                catPct >= 80 && s.fillWarn,
                                { width: `${catPct}%` },
                              ]}
                            />
                          </View>
                          <Text style={s.hint}>
                            {fmt(catSpent)} of {fmt(catBudget)} spent this month
                          </Text>
                        </>
                      )}
                    </View>
                  );
                })}
            </Section>
            <Section title="Recurring expenses">
              {recurring.length ? (
                recurring.map((t) => {
                  const c = cats.find((c) => c.id === t.category);
                  return (
                    <View key={t.id} style={s.row}>
                      <Text style={s.emoji}>{c?.icon || '📦'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={s.bold}>{t.description}</Text>
                        <Text style={s.muted}>
                          {frequencyLabels[t.frequency]} · {fmt(t.amount)}
                          {!t.active ? ' · Paused' : ''}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => toggleRecurring(t.id)}>
                        <Text style={s.linkBtn}>{t.active ? 'Pause' : 'Resume'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteRecurring(t.id)}>
                        <Text style={s.danger}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              ) : (
                <EmptyState
                  icon="🔁"
                  text="No recurring expenses yet. Add one from the Add expense screen using the Repeat option."
                  actionLabel="Add an expense"
                  onAction={() => startAdd()}
                />
              )}
            </Section>
          </>
        )}

        {tab === 'categories' && (
          <Section title="Categories">
            <TextInput
              style={s.input}
              placeholder="New category name"
              value={newCat}
              onChangeText={setNewCat}
            />
            <Text style={s.label}>Icon</Text>
            <View style={s.catGrid}>
              {CATEGORY_ICON_CHOICES.map((em) => (
                <TouchableOpacity
                  key={em}
                  onPress={() => setNewCatIcon(em)}
                  style={[s.chip, newCatIcon === em && s.selected]}
                  accessibilityRole="button"
                  accessibilityLabel={`Use icon ${em}`}
                >
                  <Text style={{ fontSize: 18 }}>{em}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[s.primary, s.btnRow]} onPress={addCategory}>
              <Plus size={17} color="#fff" />
              <Text style={s.primaryText}>Add category</Text>
            </TouchableOpacity>
            <Text style={[s.label, { marginTop: 18 }]}>Your categories</Text>
            <View style={s.catGrid}>
              {cats.map((c) => (
                <View style={s.catChip} key={c.id}>
                  <Text style={s.chipText}>
                    {c.icon} {c.name}
                  </Text>
                  {c.id.startsWith('custom-') && (
                    <TouchableOpacity
                      onPress={() => removeCategory(c.id)}
                      style={{ marginLeft: 2 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${c.name} category`}
                    >
                      <X size={14} color="#b23b3b" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </Section>
        )}

        {tab === 'profile' && (
          <>
            <Section title="Profile photo">
              <View style={s.avatarPreviewRow}>
                <View style={s.avatarCircleLg}>
                  <Text style={s.avatarEmojiLg}>{profile.avatar || '🙂'}</Text>
                </View>
              </View>
              <Text style={s.label}>Choose an avatar</Text>
              <View style={s.catGrid}>
                {avatarChoices.map((em) => (
                  <TouchableOpacity
                    key={em}
                    onPress={() => setProfile({ ...profile, avatar: em })}
                    style={[s.chip, profile.avatar === em && s.selected]}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose ${em} avatar`}
                  >
                    <Text style={{ fontSize: 20 }}>{em}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Section>
            <Section title="Profile & Preferences">
              <Text style={s.label}>First name</Text>
              <TextInput
                style={s.input}
                value={profile.firstName || ''}
                onChangeText={(x) => setProfile({ ...profile, firstName: x })}
                placeholder="Jane"
              />
              <Text style={s.label}>Last name</Text>
              <TextInput
                style={s.input}
                value={profile.lastName || ''}
                onChangeText={(x) => setProfile({ ...profile, lastName: x })}
                placeholder="Doe"
              />
              <Text style={s.label}>Nickname</Text>
              <TextInput
                style={s.input}
                value={profile.nickName || ''}
                onChangeText={(x) => setProfile({ ...profile, nickName: x })}
                placeholder="How the dashboard greets you"
              />
              <Text style={s.label}>Email</Text>
              <TextInput
                style={s.input}
                keyboardType="email-address"
                autoCapitalize="none"
                value={profile.email || ''}
                onChangeText={(x) => setProfile({ ...profile, email: x })}
                placeholder="jane@example.com"
              />
              <Text style={s.label}>Currency</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {supportedCurrencies.map((c) => (
                  <TouchableOpacity
                    key={c.code}
                    onPress={() => setProfile({ ...profile, currency: c.code })}
                    style={[s.chip, (profile.currency || 'INR') === c.code && s.selected]}
                  >
                    <Text style={s.chipText}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={s.label}>Appearance</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setTheme('light')}
                  style={[s.chip, theme === 'light' && s.selected]}
                >
                  <Text style={s.chipText}>☀ Light</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setTheme('dark')}
                  style={[s.chip, theme === 'dark' && s.selected]}
                >
                  <Text style={s.chipText}>🌙 Dark</Text>
                </TouchableOpacity>
              </View>
              <Text style={s.hint}>
                Saved automatically, and encrypted at rest like the rest of your data.
              </Text>
            </Section>
            <Section title="App lock">
              {appLock.enabled ? (
                <>
                  <Text style={s.hint}>
                    App lock is on. You&apos;ll need{' '}
                    {appLock.mode === 'biometric'
                      ? 'Face ID / fingerprint (or your PIN)'
                      : 'your PIN'}{' '}
                    to open the app.
                  </Text>
                  {biometrySupported && (
                    <View style={[s.rowTop, { marginTop: 10 }]}>
                      <Text style={s.bold}>Also allow Face ID / fingerprint</Text>
                      <TouchableOpacity
                        onPress={() => toggleBiometricMode(appLock.mode !== 'biometric')}
                        style={[s.chip, appLock.mode === 'biometric' && s.selected]}
                      >
                        <Text style={s.chipText}>
                          {appLock.mode === 'biometric' ? 'On' : 'Off'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {showPinSetup ? (
                    <PinSetupForm
                      pinDraft={pinDraft}
                      setPinDraft={setPinDraft}
                      pinConfirm={pinConfirm}
                      setPinConfirm={setPinConfirm}
                      onSave={savePin}
                      onCancel={() => {
                        setShowPinSetup(false);
                        setPinDraft('');
                        setPinConfirm('');
                      }}
                    />
                  ) : (
                    <>
                      <TouchableOpacity style={s.secondary} onPress={() => setShowPinSetup(true)}>
                        <Text style={s.secondaryText}>Change PIN</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.cancel}
                        onPress={() =>
                          Alert.alert(
                            'Turn off app lock?',
                            'Anyone who opens the app will be able to see your data.',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Turn off', style: 'destructive', onPress: turnOffLock },
                            ],
                          )
                        }
                      >
                        <Text style={[s.cancelText, s.danger]}>Turn off app lock</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Text style={s.hint}>
                    Require a PIN{biometrySupported ? ' (or Face ID / fingerprint)' : ''} to open
                    the app - a good idea for a finance app, especially on a shared or easily
                    borrowed phone.
                  </Text>
                  {showPinSetup ? (
                    <PinSetupForm
                      pinDraft={pinDraft}
                      setPinDraft={setPinDraft}
                      pinConfirm={pinConfirm}
                      setPinConfirm={setPinConfirm}
                      onSave={savePin}
                      onCancel={() => {
                        setShowPinSetup(false);
                        setPinDraft('');
                        setPinConfirm('');
                      }}
                    />
                  ) : (
                    <TouchableOpacity
                      style={[s.secondary, { marginTop: 12 }]}
                      onPress={() => setShowPinSetup(true)}
                    >
                      <Text style={s.secondaryText}>Set up app lock</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </Section>
            <Section title="Import from spreadsheet">
              <Text style={s.hint}>
                Migrating from a spreadsheet? Copy it as CSV text (Date, Amount, Category,
                Description, Payment Method, Note columns - order doesn&apos;t matter, and Category
                is matched by name) and paste it below.
              </Text>
              <TextInput
                style={[s.input, s.multiline]}
                multiline
                value={importText}
                onChangeText={setImportText}
                placeholder="Paste CSV text here"
              />
              <TouchableOpacity style={[s.secondary, s.btnRow]} onPress={importCSV}>
                <Upload size={16} color="#33500f" />
                <Text style={s.secondaryText}>Import CSV</Text>
              </TouchableOpacity>
            </Section>
            <Section title="Backup & restore">
              <Text style={s.hint}>
                This app keeps everything private on your device only - there&apos;s no account or
                cloud sync. That means uninstalling the app (or your phone&apos;s normal app-data
                backup not being available) can erase your data. Export a backup before uninstalling
                or switching phones, then restore it here afterwards.
              </Text>
              <Text style={[s.label, { marginTop: 14 }]}>Backup password</Text>
              <TextInput
                style={s.input}
                secureTextEntry
                value={backupPassword}
                onChangeText={setBackupPassword}
                placeholder="At least 4 characters"
              />
              <Text style={s.hint}>
                Your backup file is encrypted with this password. Daily Expense Tracker never stores
                it anywhere, so if you forget it, the backup can&apos;t be recovered - keep it
                somewhere safe.
              </Text>
              <TouchableOpacity
                style={[s.secondary, s.btnRow, { marginTop: 14 }]}
                onPress={exportBackup}
              >
                <Download size={16} color="#33500f" />
                <Text style={s.secondaryText}>Export backup</Text>
              </TouchableOpacity>
              <Text style={[s.label, { marginTop: 10 }]}>Restore from backup</Text>
              <Text style={s.hint}>
                Open your backup file, copy all of its text, and paste it below.
              </Text>
              <TextInput
                style={[s.input, s.multiline]}
                multiline
                value={restoreText}
                onChangeText={setRestoreText}
                placeholder="Paste backup JSON here"
              />
              <TextInput
                style={s.input}
                secureTextEntry
                value={restorePassword}
                onChangeText={setRestorePassword}
                placeholder="Backup password (if encrypted)"
              />
              <TouchableOpacity style={[s.primary, s.btnRow]} onPress={restoreBackup}>
                <Upload size={16} color="#fff" />
                <Text style={s.primaryText}>Restore backup</Text>
              </TouchableOpacity>
            </Section>
          </>
        )}
      </ScrollView>
      {snackbar && (
        <View style={s.snackbar}>
          <Text style={s.snackbarText} numberOfLines={1}>
            {snackbar.message}
          </Text>
          <TouchableOpacity onPress={dismissSnackbarAndUndo}>
            <Text style={s.snackbarAction}>Undo</Text>
          </TouchableOpacity>
        </View>
      )}
      <Nav />
    </SafeAreaView>
  );
}

export default AppInner;
