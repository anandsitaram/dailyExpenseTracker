import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Lock } from 'lucide-react-native';
import { verifyBiometricUnlock } from '../../services/index.js';
import { AppLockConfig } from '../../../../core/src/index.js';
import s, { DARK } from '../../styles/styles.js';

export interface LockScreenProps {
  appLock: AppLockConfig;
  onUnlock: () => void;
}

export function LockScreen({ appLock, onUnlock }: LockScreenProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [usePin, setUsePin] = useState(appLock.mode !== 'biometric');

  useEffect(() => {
    if (appLock.mode === 'biometric' && !usePin) {
      verifyBiometricUnlock().then((ok) => {
        if (ok) onUnlock();
        else setUsePin(true);
      });
    }
  }, [usePin]);

  function tryPin() {
    if (pin === appLock.pin) onUnlock();
    else {
      setError('Incorrect PIN');
      setPin('');
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.lockWrap}>
        <Lock size={40} color={DARK} strokeWidth={1.6} style={{ marginBottom: 6 }} />
        <Text style={s.title}>Locked</Text>
        <Text style={s.muted}>
          {usePin ? 'Enter your PIN to continue' : 'Unlock with Face ID / fingerprint'}
        </Text>
        {usePin ? (
          <>
            <TextInput
              style={[s.input, s.pinInput]}
              keyboardType="numeric"
              secureTextEntry
              maxLength={6}
              value={pin}
              onChangeText={(t) => {
                setPin(t);
                setError('');
              }}
              placeholder="••••"
              autoFocus
            />
            {!!error && <Text style={s.danger}>{error}</Text>}
            <TouchableOpacity style={s.primary} onPress={tryPin}>
              <Text style={s.primaryText}>Unlock</Text>
            </TouchableOpacity>
            {appLock.mode === 'biometric' && (
              <TouchableOpacity style={s.cancel} onPress={() => setUsePin(false)}>
                <Text style={s.cancelText}>Use Face ID / fingerprint instead</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <TouchableOpacity
            style={s.primary}
            onPress={() =>
              verifyBiometricUnlock().then((ok) => (ok ? onUnlock() : setUsePin(true)))
            }
          >
            <Text style={s.primaryText}>Try again</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
