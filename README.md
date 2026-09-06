# 💰 dailyExpenseTracker — Phase 5

A modern **day-to-day expense tracker** for Web, Android and iOS. This repository contains the implementation through **Phase 5: Mobile App**.

## 🚀 What is included through Phase 5

### Phase 1 — Foundation
- React + Vite web application
- React Native + Expo mobile application
- Shared categories, payment methods, demo data and INR utilities
- Responsive UI foundation

### Phase 2 — Expense Management
- Add expense
- Edit expense
- Delete expense
- Expense history
- Search expenses
- Filter by category
- Date, description, notes and payment method
- Local persistence on Web using LocalStorage
- Local persistence on Mobile using AsyncStorage

### Phase 3 — Dashboard & Analytics
- Monthly total
- Transaction count
- Average transaction
- Highest spending category
- Daily spending trend
- Category breakdown
- Monthly spending comparison
- Responsive charts on Web

### Phase 4 — Budget & Categories
- Monthly budget
- Budget percentage consumed
- Remaining budget
- Budget warning when spending reaches 80%
- Predefined categories
- Add custom categories

### Phase 5 — Mobile
- React Native + Expo
- Android and iOS-ready configuration
- Mobile dashboard
- Quick Add Expense
- Expense history
- Category analytics
- Daily spending view
- Monthly budget
- Persistent mobile data with AsyncStorage
- Mobile bottom navigation

## 🧭 Application screens

### Web
1. Dashboard
2. Expenses
3. Add/Edit Expense
4. Analytics
5. Budget
6. Categories

### Mobile
1. Home
2. Expenses
3. Add
4. Analytics
5. Budget

## 🏗️ Architecture

```text
dailyExpenseTracker/
├── shared/
│   ├── index.js
│   └── package.json
│
├── web/
│   ├── src/
│   │   ├── main.jsx
│   │   └── style.css
│   ├── index.html
│   └── package.json
│
├── mobile/
│   ├── App.js
│   ├── app.json
│   └── package.json
│
├── package.json
└── README.md
```

## 🖥️ Run Web

Requirements: Node.js 18+ recommended.

```bash
cd web
npm install
npm run dev
```

Open the Vite URL shown in the terminal.

## 📱 Run Mobile

Install Node.js and Expo tooling, then:

```bash
cd mobile
npm install
npx expo start
```

From Expo you can run on:

- Android emulator
- Android physical device
- iOS simulator on macOS
- iPhone using Expo Go
- Web preview

## 💾 Storage

Phase 5 is intentionally backend-free:

- Web → `localStorage`
- Mobile → `AsyncStorage`

This makes the application easy to run locally and provides a clean foundation for Phase 6 cloud synchronization.

## 💳 Payment

No real payment processing is included or required. This is an expense tracking application; payment method means the method used for the expense, such as UPI, Cash or Credit Card.

## 📊 Example categories

🍔 Food · 🛒 Groceries · 🏠 Home · 🚗 Transport · ⛽ Fuel · 💊 Medical · 📱 Bills · 🎓 Education · 👕 Shopping · 🎬 Entertainment · ✈️ Travel · 💰 Investment · 🎁 Gifts · 📦 Other

## 🛣️ Next phases

### Phase 6 — Cloud
- Authentication
- Go backend / REST API
- PostgreSQL
- Secure user accounts
- Web ↔ Mobile synchronization
- Backup and restore

### Phase 7 — AI
- Automatic expense categorization
- Spending explanations
- Unusual-spending detection
- Saving recommendations
- Natural language finance queries

### Phase 8 — Production
- CI/CD
- Monitoring
- Error tracking
- Play Store deployment
- App Store deployment

## 🎯 Product goal

The long-term goal is not just to record expenses, but to answer:

> **“Where is my money going, and what can I do about it?”**

Phase 5 establishes the complete Web + Mobile product foundation needed to build that experience.
