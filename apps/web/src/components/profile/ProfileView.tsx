import React, { ChangeEvent, Dispatch, SetStateAction } from 'react';
import { Panel } from '../common/Panel.js';
import { avatarChoices, supportedCurrencies } from '../../../../core/src/index.js';
import { Profile as ProfileData } from '../../../../core/src/types.js';

export interface ProfileProps {
  profile: ProfileData;
  setProfile: Dispatch<SetStateAction<ProfileData>>;
}

export function Profile({ profile, setProfile }: ProfileProps) {
  const set = <K extends keyof ProfileData>(k: K, v: ProfileData[K]) =>
    setProfile({ ...profile, [k]: v });

  function onPickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      setProfile((p) => ({ ...p, avatarImage: String(reader.result || '') }));
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <Panel title="Profile">
      <div className="avatarRow">
        <div className="avatarPreview">
          {profile.avatarImage ? (
            <img src={profile.avatarImage} alt="Profile" />
          ) : (
            <span>{profile.avatar || '🙂'}</span>
          )}
        </div>
        <div className="avatarActions">
          <label className="mini fileBtn">
            Upload photo
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={onPickImage}
            />
          </label>
          {profile.avatarImage && (
            <button className="mini danger" onClick={() => set('avatarImage', '')}>
              Remove photo
            </button>
          )}
        </div>
      </div>
      <div className="avatarPicker">
        {avatarChoices.map((em) => (
          <button
            type="button"
            key={em}
            className={
              'avatarChip' + (profile.avatar === em && !profile.avatarImage ? ' selected' : '')
            }
            onClick={() => {
              set('avatar', em);
              set('avatarImage', '');
            }}
          >
            {em}
          </button>
        ))}
      </div>
      <div className="form">
        <label>
          First name
          <input
            value={profile.firstName || ''}
            onChange={(e) => set('firstName', e.target.value)}
            placeholder="Jane"
          />
        </label>
        <label>
          Last name
          <input
            value={profile.lastName || ''}
            onChange={(e) => set('lastName', e.target.value)}
            placeholder="Doe"
          />
        </label>
        <label>
          Nickname
          <input
            value={profile.nickName || ''}
            onChange={(e) => set('nickName', e.target.value)}
            placeholder="How the dashboard greets you"
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={profile.email || ''}
            onChange={(e) => set('email', e.target.value)}
            placeholder="jane@example.com"
          />
        </label>
        <label>
          Currency
          <select
            value={profile.currency || 'INR'}
            onChange={(e) => set('currency', e.target.value)}
          >
            {supportedCurrencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="hint">
        Saved automatically, and encrypted at rest like the rest of your data. Set a nickname to
        personalize your dashboard greeting.
      </p>
    </Panel>
  );
}
