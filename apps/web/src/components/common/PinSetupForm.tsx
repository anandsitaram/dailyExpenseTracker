import React from 'react';

export interface PinSetupFormProps {
  pinDraft: string;
  setPinDraft: (val: string) => void;
  pinConfirm: string;
  setPinConfirm: (val: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function PinSetupForm({
  pinDraft,
  setPinDraft,
  pinConfirm,
  setPinConfirm,
  onSave,
  onCancel,
}: PinSetupFormProps) {
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
