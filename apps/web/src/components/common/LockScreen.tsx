import React, { useState, FormEvent } from 'react';
import { Lock } from 'lucide-react';
import { AppLockConfig } from '../../../../core/src/index.js';

export interface LockScreenProps {
  appLock: AppLockConfig;
  onUnlock: () => void;
}

export function LockScreen({ appLock, onUnlock }: LockScreenProps) {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');

  function tryPin(e: FormEvent) {
    e.preventDefault();
    if (pin === appLock.pin) {
      onUnlock();
    } else {
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
