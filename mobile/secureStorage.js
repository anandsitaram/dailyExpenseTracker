// Encrypts data at rest in AsyncStorage using AES.
// The AES key is generated once with a CSPRNG and stored in expo-secure-store, which
// on iOS is backed by the Keychain and on Android by Keystore-backed EncryptedSharedPreferences.
// AsyncStorage itself has no per-item size limit suited to a growing expense list, while
// SecureStore does (~2KB/item on Android) - so only the small key lives in SecureStore,
// and the bulk JSON is encrypted with it and stored in AsyncStorage.
// This protects data from anything reading app storage files directly off the device
// (a lost/stolen phone without the OS unlocked, a backup extraction tool). It does not
// protect against a compromised/jailbroken device running code inside this app's process.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js';

const KEY_NAME='det-master-key';
let cachedKey=null;

async function getOrCreateKey(){
 if(cachedKey)return cachedKey;
 let key=await SecureStore.getItemAsync(KEY_NAME);
 if(!key){
  const bytes=await Crypto.getRandomBytesAsync(32);
  key=Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
  await SecureStore.setItemAsync(KEY_NAME,key,{keychainAccessible:SecureStore.WHEN_UNLOCKED});
 }
 cachedKey=key;
 return key;
}

export async function secureSetItem(key,value){
 const masterKey=await getOrCreateKey();
 const cipher=CryptoJS.AES.encrypt(JSON.stringify(value),masterKey).toString();
 await AsyncStorage.setItem(key,cipher);
}

export async function secureGetItem(key,fallback=null){
 const raw=await AsyncStorage.getItem(key);
 if(!raw)return fallback;
 try{
  const masterKey=await getOrCreateKey();
  const bytes=CryptoJS.AES.decrypt(raw,masterKey);
  const json=bytes.toString(CryptoJS.enc.Utf8);
  return json?JSON.parse(json):fallback;
 }catch(e){
  console.error('secureStorage: failed to decrypt',key,e);
  return fallback;
 }
}
