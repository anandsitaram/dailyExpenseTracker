// Password-based encryption for backup EXPORT FILES - separate from secureStorage.js, which
// encrypts data at rest with a device-held key the user never sees or types. A backup file is
// meant to leave the device (saved to Drive, emailed to yourself, kept on a laptop), so it's
// protected with a password the user chooses and remembers instead - the app never stores
// this password anywhere. Uses PBKDF2 (100k iterations, SHA-256) to turn the password into an
// AES-256 key, with a fresh random salt and IV per export so the same password never produces
// the same ciphertext twice.
import CryptoJS from 'crypto-js';

const PBKDF2_ITERATIONS=100000;

function deriveKey(password,saltWordArray){
 return CryptoJS.PBKDF2(password,saltWordArray,{keySize:256/32,iterations:PBKDF2_ITERATIONS});
}

// plainJsonStr -> JSON-stringified envelope (safe to write straight to a file)
export function encryptBackupPayload(plainJsonStr,password){
 const salt=CryptoJS.lib.WordArray.random(16);
 const iv=CryptoJS.lib.WordArray.random(16);
 const key=deriveKey(password,salt);
 const encrypted=CryptoJS.AES.encrypt(plainJsonStr,key,{iv,mode:CryptoJS.mode.CBC,padding:CryptoJS.pad.Pkcs7});
 return JSON.stringify({
  encrypted:true,
  kdf:'PBKDF2-SHA256',
  iterations:PBKDF2_ITERATIONS,
  cipher:'AES-256-CBC',
  salt:salt.toString(CryptoJS.enc.Hex),
  iv:iv.toString(CryptoJS.enc.Hex),
  data:encrypted.ciphertext.toString(CryptoJS.enc.Base64)
 });
}

// envelope JSON string + password -> plain backup JSON string (throws on wrong password/corruption)
export function decryptBackupPayload(envelopeStr,password){
 const env=JSON.parse(envelopeStr);
 const salt=CryptoJS.enc.Hex.parse(env.salt);
 const iv=CryptoJS.enc.Hex.parse(env.iv);
 const key=deriveKey(password,salt);
 const cipherParams=CryptoJS.lib.CipherParams.create({ciphertext:CryptoJS.enc.Base64.parse(env.data)});
 const decrypted=CryptoJS.AES.decrypt(cipherParams,key,{iv,mode:CryptoJS.mode.CBC,padding:CryptoJS.pad.Pkcs7});
 const text=decrypted.toString(CryptoJS.enc.Utf8);
 if(!text)throw new Error('Wrong password or corrupted backup');
 return text;
}
