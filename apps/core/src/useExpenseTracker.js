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
} from './index.js';

export function useExpenseTracker({ storage, initialTheme = 'light', onLoadError } = {}) {
  const get = storage?.get || (async (_, fallback) => fallback);
  const set = storage?.set || (async () => {});
  const [expenses, setExpenses] = useState(emptyExpenses);
  const [categories, setCategories] = useState(defaultCategories);
  const [budget, setBudget] = useState(0);
  const [categoryBudgets, setCategoryBudgets] = useState({});
  const [recurring, setRecurring] = useState([]);
  const [appLock, setAppLock] = useState(defaultAppLock);
  const [profile, setProfile] = useState(defaultProfile);
  const [theme, setTheme] = useState(initialTheme);
  const [onboardingDone, setOnboardingDone] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [undoState, setUndoState] = useState(null);
  const undoTimer = useRef(null);

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
          get('recurring', []),
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

  const persisted = [
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
    const result = {};
    for (const expense of monthExpenseItems)
      result[expense.category] = (result[expense.category] || 0) + Number(expense.amount);
    return result;
  }, [monthExpenseItems]);
  const daily = useMemo(() => {
    const result = {};
    for (const expense of monthExpenseItems)
      result[expense.date] = (result[expense.date] || 0) + Number(expense.amount);
    return Object.entries(result)
      .sort()
      .map(([date, amount]) => ({ date: date.slice(5), amount }));
  }, [monthExpenseItems]);
  const spendByDay = useMemo(() => {
    const result = {};
    for (const expense of expenses)
      result[expense.date] = (result[expense.date] || 0) + Number(expense.amount);
    return result;
  }, [expenses]);
  const visibleExpenses = useMemo(
    () =>
      expenses
        .filter(
          (expense) =>
            `${expense.description || ''} ${expense.note || ''}`
              .toLowerCase()
              .includes(search.toLowerCase()) &&
            (filter === 'all' || expense.category === filter) &&
            (!dateFrom || expense.date >= dateFrom) &&
            (!dateTo || expense.date <= dateTo) &&
            (!amountMin || Number(expense.amount) >= Number(amountMin)) &&
            (!amountMax || Number(expense.amount) <= Number(amountMax)),
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [expenses, search, filter, dateFrom, dateTo, amountMin, amountMax],
  );
  const quickAdd = useMemo(() => computeQuickAddSuggestions(expenses, 6), [expenses]);
  const streaks = useMemo(() => computeStreaks(expenses, todayDateKey()), [expenses]);
  const comparison = useMemo(
    () => computePeriodComparison(expenses, categories, todayDateKey()),
    [expenses, categories],
  );

  function flashUndo(message, callback) {
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
  function saveExpense(expense, repeat = 'none', editing = null) {
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
  function removeExpense(id) {
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
  function addQuickExpense(suggestion) {
    const expense = {
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
  function toggleRecurring(id) {
    setRecurring((current) =>
      current.map((template) =>
        template.id === id ? { ...template, active: !template.active } : template,
      ),
    );
  }
  function setCategoryBudget(id, value) {
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
    daily,
    spendByDay,
    visibleExpenses,
    quickAdd,
    streaks,
    comparison,
    dateFilterActive: dateFrom || dateTo || amountMin || amountMax,
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
