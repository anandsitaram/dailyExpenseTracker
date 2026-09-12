// AES encryption at rest for AsyncStorage. Key lives in Keychain/Keystore (via react-native-keychain), bulk JSON encrypted with it in AsyncStorage.

import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import CryptoJS from 'crypto-js';

const KEYCHAIN_SERVICE = 'com.dailyexpensetracker.app.masterkey';
let cachedKey: string | null = null;
let keyPromise: Promise<string> | null = null;

function randomHexKey(bytesLength: number): string {
  const bytes = new Uint8Array(bytesLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getOrCreateKey() {
  if (keyPromise) return keyPromise;
  keyPromise = loadOrCreateKey();
  try {
    return await keyPromise;
  } catch (error) {
    keyPromise = null;
    throw error;
  }
}

async function loadOrCreateKey() {
  if (cachedKey) return cachedKey;
  const existing = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
  if (existing && existing.password) {
    cachedKey = existing.password;
    return cachedKey;
  }
  const key = randomHexKey(32);
  await Keychain.setGenericPassword('det-master-key', key, {
    service: KEYCHAIN_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
  });
  cachedKey = key;
  return key;
}

export async function secureSetItem<T>(key: string, value: T): Promise<void> {
  const masterKey = await getOrCreateKey();
  const cipher = CryptoJS.AES.encrypt(JSON.stringify(value), masterKey).toString();
  await AsyncStorage.setItem(key, cipher);
}

export async function secureGetItem<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    const masterKey = await getOrCreateKey();
    const bytes = CryptoJS.AES.decrypt(raw, masterKey);
    const json = bytes.toString(CryptoJS.enc.Utf8);
    return json ? JSON.parse(json) : fallback;
  } catch (e) {
    console.error('secureStorage: failed to decrypt', key, e);
    throw new Error(`Unable to read encrypted storage: ${key}`);
  }
}
