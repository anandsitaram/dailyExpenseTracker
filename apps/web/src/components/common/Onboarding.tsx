import React from 'react';

export interface OnboardingProps {
  onDone: () => void;
}

export function Onboarding({ onDone }: OnboardingProps) {
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
