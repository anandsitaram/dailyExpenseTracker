# Daily Expense Tracker

A simple, private way to track daily expenses. No spreadsheets.

## Try it

- Web app: https://my-daily-expense-tracker.vercel.app/
- Mobile: build the APK via the Android Actions workflow (`daily-expense-tracker.apk` artifact)

### Demo

<img src="recordings/application-flow.gif" alt="Daily Expense Tracker app demo" width="300"/>

## Why

Most people don't track expenses daily because it's tedious - open a spreadsheet, remember categories, add it up by hand. By the time the credit card bill shows up it's too late to do anything about it.

This app makes logging an expense take a few seconds and shows you spend/budget/remaining right on the dashboard, so you can course-correct during the month instead of after it. Works the same on web and mobile, all data stays on-device, no sign-up.

## Features

**Logging**
- Add expense: amount, category, payment method, date, note
- Edit/delete past entries, undo on delete
- Tap a calendar date to add for that day; see other expenses already logged that day
- Search + filter by category, date range, amount

**Dashboard**
- Monthly expenses, income, remaining balance, top category
- Calendar with daily spend highlighted
- Recent expenses list
- Empty state on fresh install (no fake data)

**Budgeting**
- Monthly budget + per-category budgets
- Recurring expenses (rent, EMIs, subscriptions) - daily/weekly/monthly, auto-catch-up if the app wasn't opened for a while
- Progress bar, 80% warning threshold

**Analytics**
- Category breakdown (chart on web)
- Daily spend trend
- Month-over-month income vs expense
- Top category auto-surfaced

**Categories**
- Built-in: Food, Groceries, Home, Transport, Fuel, Medical, Bills, Education, Shopping, Entertainment, Travel, Investment, Gifts, etc.
- Custom categories with icon
- Warning before deleting a category in use
- Income tracking (e.g. Salary) alongside expenses

**Profile**
- Nickname, avatar (or custom photo on web)
- Name/email stored locally

**Export/backup**
- Export to Excel/CSV
- Password-encrypted full backup (expenses, categories, budgets, recurring, profile)
- Restore from backup - needed since there's no server-side copy

**Security**
- Optional app-open lock: PIN (both platforms), Face ID/fingerprint (mobile)
- Re-locks on backgrounding, not just cold start

**Private by design**
- No account, no login, no ads
- Nothing sent to a server
- Encrypted at rest: Keychain/Keystore on mobile, non-extractable browser key on web

**Other**
- Shared codebase for web + native mobile (Android/iOS)
- Light/dark mode on web

## Storage & privacy

No backend - no server, no database, no account. Everything's encrypted on-device:

- Web: non-extractable key in browser, ciphertext in `localStorage`
- Mobile: key in Keychain (iOS) / Keystore (Android), ciphertext in `AsyncStorage`

## Stack

React + Vite (web), React Native bare (mobile), Playwright (e2e), GitHub Actions (CI + Android build).
