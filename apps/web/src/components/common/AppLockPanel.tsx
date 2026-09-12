import React, { Dispatch, SetStateAction, useState } from 'react';
import { Panel } from './Panel.js';
import { PinSetupForm } from './PinSetupForm.js';
import { defaultAppLock, isValidPin, AppLockConfig } from '../../../../core/src/index.js';
import { secureSet } from '../../services/storage.js';

export interface AppLockPanelProps {
  appLock: AppLockConfig;
  setAppLock: Dispatch<SetStateAction<AppLockConfig>>;
  onUnlockNow: () => void;
}

export function AppLockPanel({ appLock, setAppLock, onUnlockNow }: AppLockPanelProps) {
  const [showSetup, setShowSetup] = useState<boolean>(false);
  const [pinDraft, setPinDraft] = useState<string>('');
  const [pinConfirm, setPinConfirm] = useState<string>('');

  async function persistLock(nextLock: AppLockConfig) {
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
