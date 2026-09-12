import { useEffect, useMemo, useRef, useState } from 'react';
import {
  defaultAppLock,
  defaultCategories,
  defaultProfile,
  emptyExpenses,
  generateDueExpenses,
  computePeriodComparison,
  computeQuickAddSuggestions,
  computeStreaks,
  formatINR,
  isIncomeCategory,
  total,
  todayDateKey,
  AppLockConfig,
} from './index';
import { Category, Expense, Profile, RecurringTemplate } from './types';

export interface StorageAdapter {
  get: <T>(key: string, fallback: T) => Promise<T>;
  set: <T>(key: string, value: T) => Promise<void>;
}

export interface UseExpenseTrackerOptions {
  storage?: StorageAdapter;
  initialTheme?: 'light' | 'dark';
  onLoadError?: (error: unknown) => void;
}

export function useExpenseTracker({
  storage,
  initialTheme = 'light',
  onLoadError,
}: UseExpenseTrackerOptions = {}) {
  const get = storage?.get || (async <T>(_: string, fallback: T): Promise<T> => fallback);
  const set = storage?.set || (async () => {});

  const [expenses, setExpenses] = useState<Expense[]>(emptyExpenses);
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [budget, setBudget] = useState<number>(0);
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>({});
  const [recurring, setRecurring] = useState<RecurringTemplate[]>([]);
  const [appLock, setAppLock] = useState<AppLockConfig>(defaultAppLock);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [theme, setTheme] = useState<'light' | 'dark'>(initialTheme);
  const [onboardingDone, setOnboardingDone] = useState<boolean>(true);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [filter, setFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [amountMin, setAmountMin] = useState<string>('');
  const [amountMax, setAmountMax] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [undoState, setUndoState] = useState<{ message: string; callback: () => void } | null>(
    null,
  );
  const undoTimer = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [
          loadedExpenses,
          loadedCategories,
          loadedBudget,
          loadedProfile,
          loadedCategoryBudgets,
          loadedRecurring,
          loadedAppLock,
          loadedTheme,
          loadedOnboarding,
        ] = await Promise.all([
          get('expenses', emptyExpenses),
          get('categories', defaultCategories),
          get('budget', 0),
          get('profile', defaultProfile),
          get('categoryBudgets', {}),
          get('recurring', [] as RecurringTemplate[]),
          get('appLock', defaultAppLock),
          get('theme', initialTheme),
          get('onboardingDone', false),
        ]);
        if (cancelled) return;
        const { newExpenses, updatedTemplates } = generateDueExpenses(
          loadedRecurring,
          loadedExpenses,
          todayDateKey(),
        );
        setExpenses(newExpenses.length ? [...newExpenses, ...loadedExpenses] : loadedExpenses);
        setCategories(loadedCategories);
        setBudget(Number(loadedBudget) || 0);
        setProfile({ ...defaultProfile, ...loadedProfile });
        setCategoryBudgets(loadedCategoryBudgets);
        setRecurring(updatedTemplates);
        setAppLock({ ...defaultAppLock, ...loadedAppLock });
        setTheme(loadedTheme === 'dark' ? 'dark' : 'light');
        setOnboardingDone(!!loadedOnboarding);
        setLoaded(true);
      } catch (error) {
        console.error('Failed to load encrypted app data', error);
        if (!cancelled) {
          setLoadError('Unable to unlock your saved data. Restore a backup or reload the app.');
          onLoadError?.(error);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persisted: Array<[string, any]> = [
    ['expenses', expenses],
    ['categories', categories],
    ['budget', budget],
    ['profile', profile],
    ['categoryBudgets', categoryBudgets],
    ['recurring', recurring],
    ['appLock', appLock],
    ['theme', theme],
    ['onboardingDone', onboardingDone],
  ];

  useEffect(() => {
    if (!loaded) return;
    for (const [key, value] of persisted) set(key, value).catch(console.error);
  }, [
    loaded,
    expenses,
    categories,
    budget,
    profile,
    categoryBudgets,
    recurring,
    appLock,
    theme,
    onboardingDone,
  ]);

  const month = useMemo(
    () => expenses.filter((expense) => expense.date.startsWith(todayDateKey().slice(0, 7))),
    [expenses],
  );
  const monthExpenseItems = useMemo(
    () => month.filter((expense) => !isIncomeCategory(categories, expense.category)),
    [month, categories],
  );
  const monthIncomeItems = useMemo(
    () => month.filter((expense) => isIncomeCategory(categories, expense.category)),
    [month, categories],
  );
  const monthTotal = total(monthExpenseItems);
  const monthIncomeTotal = total(monthIncomeItems);
  const remaining = budget - monthTotal;
  const byCat = useMemo(
    () =>
      categories
        .filter((category) => !category.income)
        .map((category) => ({
          ...category,
          name: category.name,
          value: total(monthExpenseItems.filter((expense) => expense.category === category.id)),
        }))
        .filter((category) => category.value)
        .sort((a, b) => b.value - a.value),
    [categories, monthExpenseItems],
  );
  const categorySpend = useMemo(() => {
    const result: Record<string, number> = {};
    for (const expense of monthExpenseItems)
      result[expense.category] = (result[expense.category] || 0) + Number(expense.amount);
    return result;
  }, [monthExpenseItems]);
  const daily = useMemo(() => {
    const result: Record<string, number> = {};
    for (const expense of monthExpenseItems)
      result[expense.date] = (result[expense.date] || 0) + Number(expense.amount);
    return Object.entries(result)
      .sort()
      .map(([date, amount]) => ({ date: date.slice(5), amount }));
  }, [monthExpenseItems]);
  const spendByDay = useMemo(() => {
    const result: Record<string, number> = {};
    for (const expense of expenses)
      result[expense.date] = (result[expense.date] || 0) + Number(expense.amount);
    return result;
  }, [expenses]);

  const visibleExpenses = useMemo(
    () =>
      expenses
        .filter((expense) => {
          const isInc = isIncomeCategory(categories, expense.category);
          if (typeFilter === 'expense' && isInc) return false;
          if (typeFilter === 'income' && !isInc) return false;
          return (
            `${expense.description || ''} ${expense.note || ''}`
              .toLowerCase()
              .includes(search.toLowerCase()) &&
            (filter === 'all' || expense.category === filter) &&
            (!dateFrom || expense.date >= dateFrom) &&
            (!dateTo || expense.date <= dateTo) &&
            (!amountMin || Number(expense.amount) >= Number(amountMin)) &&
            (!amountMax || Number(expense.amount) <= Number(amountMax))
          );
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [expenses, categories, search, filter, typeFilter, dateFrom, dateTo, amountMin, amountMax],
  );

  const quickAdd = useMemo(() => computeQuickAddSuggestions(expenses, 6), [expenses]);
  const streaks = useMemo(() => computeStreaks(expenses, todayDateKey()), [expenses]);
  const comparison = useMemo(
    () => computePeriodComparison(expenses, categories, todayDateKey()),
    [expenses, categories],
  );

  function flashUndo(message: string, callback: () => void) {
    clearTimeout(undoTimer.current);
    setUndoState({ message, callback });
    undoTimer.current = setTimeout(() => setUndoState(null), 6000);
  }

  function undoLast() {
    if (!undoState) return;
    undoState.callback();
    clearTimeout(undoTimer.current);
    setUndoState(null);
  }

  function saveExpense(
    expense: Expense,
    repeat: string = 'none',
    editing: { id?: string } | null = null,
  ) {
    if (!editing && repeat !== 'none') {
      const template = {
        id: 'r-' + Date.now(),
        amount: expense.amount,
        description: expense.description,
        category: expense.category,
        paymentMethod: expense.paymentMethod,
        note: expense.note,
        frequency: repeat,
        startDate: expense.date,
        active: true,
        lastGeneratedDate: null,
      };
      const generated = generateDueExpenses([template], expenses, todayDateKey());
      setRecurring((current) => [...current, ...generated.updatedTemplates]);
      setExpenses((current) => [...generated.newExpenses, ...current]);
    } else if (editing) {
      setExpenses((current) => current.map((item) => (item.id === expense.id ? expense : item)));
    } else {
      setExpenses((current) => [expense, ...current]);
    }
  }

  function removeExpense(id: string) {
    setExpenses((current) => {
      const index = current.findIndex((expense) => expense.id === id);
      if (index === -1) return current;
      const removed = current[index];
      flashUndo('Expense deleted', () =>
        setExpenses((items) => [...items.slice(0, index), removed, ...items.slice(index)]),
      );
      return current.filter((expense) => expense.id !== id);
    });
  }

  function addQuickExpense(suggestion: {
    amount: number;
    description: string;
    category: string;
    paymentMethod?: string;
  }) {
    const expense: Expense = {
      id: Date.now().toString(),
      amount: suggestion.amount,
      description: suggestion.description,
      date: todayDateKey(),
      category: suggestion.category,
      paymentMethod: suggestion.paymentMethod,
      note: '',
    };
    setExpenses((current) => [expense, ...current]);
    flashUndo(`Added ${suggestion.description} · ${formatINR(suggestion.amount)}`, () =>
      setExpenses((current) => current.filter((item) => item.id !== expense.id)),
    );
  }

  function toggleRecurring(id: string) {
    setRecurring((current) =>
      current.map((template) =>
        template.id === id ? { ...template, active: !template.active } : template,
      ),
    );
  }

  function setCategoryBudget(id: string, value: string | number) {
    setCategoryBudgets((current) => ({ ...current, [id]: Number(value) || 0 }));
  }

  return {
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
    month,
    monthExpenseItems,
    monthIncomeItems,
    monthTotal,
    monthIncomeTotal,
    remaining,
    byCat,
    categorySpend,
    spendByDay,
    daily,
    visibleExpenses,
    quickAdd,
    streaks,
    comparison,
    typeFilter,
    setTypeFilter,
    dateFilterActive: Boolean(dateFrom || dateTo || amountMin || amountMax || typeFilter !== 'all'),
    singleDaySelected: dateFrom && dateFrom === dateTo ? dateFrom : null,
    flashUndo,
    undoLast,
    undoState,
    saveExpense,
    removeExpense,
    addQuickExpense,
    toggleRecurring,
    setCategoryBudget,
  };
}
