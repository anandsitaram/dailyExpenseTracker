// Encrypts data at rest in AsyncStorage using AES.
// The AES key is generated once with a CSPRNG and stored via react-native-keychain, which
// on iOS is backed by the Keychain and on Android by Keystore-backed EncryptedSharedPreferences.
// AsyncStorage itself has no per-item size limit suited to a growing expense list, while
// the Keychain/Keystore is meant for small secrets - so only the small key lives there,
// and the bulk JSON is encrypted with it and stored in AsyncStorage.
// This protects data from anything reading app storage files directly off the device
// (a lost/stolen phone without the OS unlocked, a backup extraction tool). It does not
// protect against a compromised/jailbroken device running code inside this app's process.

import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import CryptoJS from 'crypto-js';

const KEYCHAIN_SERVICE='com.dailyexpensetracker.app.masterkey';
let cachedKey=null;

function randomHexKey(bytesLength){
 const bytes=new Uint8Array(bytesLength);
 crypto.getRandomValues(bytes);
 return Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function getOrCreateKey(){
 if(cachedKey)return cachedKey;
 const existing=await Keychain.getGenericPassword({service:KEYCHAIN_SERVICE});
 if(existing&&existing.password){
  cachedKey=existing.password;
  return cachedKey;
 }
 const key=randomHexKey(32);
 await Keychain.setGenericPassword('det-master-key',key,{
  service:KEYCHAIN_SERVICE,
  accessible:Keychain.ACCESSIBLE.WHEN_UNLOCKED
 });
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
