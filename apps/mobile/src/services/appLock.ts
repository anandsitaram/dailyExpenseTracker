// Face ID / fingerprint via react-native-keychain; dummy secret gated behind biometric accessControl. PIN is always the fallback.
import * as Keychain from 'react-native-keychain';

const BIOMETRIC_SERVICE = 'com.dailyexpensetracker.applock.biometric';

export async function isBiometrySupported() {
  try {
    const type = await Keychain.getSupportedBiometryType();
    return !!type;
  } catch (e) {
    return false;
  }
}

export async function enableBiometricUnlock() {
  await Keychain.setGenericPassword('applock', 'enabled', {
    service: BIOMETRIC_SERVICE,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
  });
}

export async function disableBiometricUnlock() {
  try {
    await Keychain.resetGenericPassword({ service: BIOMETRIC_SERVICE });
  } catch (e) {
    // no entry to clean up, ignore
  }
}

export async function verifyBiometricUnlock() {
  try {
    const result = await Keychain.getGenericPassword({
      service: BIOMETRIC_SERVICE,
      authenticationPrompt: { title: 'Unlock Daily Expense Tracker', cancel: 'Use PIN instead' },
    });
    return !!result;
  } catch (e) {
    return false;
  }
}
