import CryptoJS from 'crypto-js';
import {
  BACKUP_PBKDF2_ITERATIONS,
  buildBackupEnvelope,
  parseBackupEnvelope,
} from './backupFormat';

function deriveKey(password: string, salt: CryptoJS.lib.WordArray) {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: BACKUP_PBKDF2_ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  });
}

// plainJsonStr -> JSON-stringified envelope (safe to write straight to a downloaded file)
export function encryptBackupPayload(plainJsonStr: string, password: string): string {
  const salt = CryptoJS.lib.WordArray.random(16);
  const iv = CryptoJS.lib.WordArray.random(16);
  const key = deriveKey(password, salt);
  const encrypted = CryptoJS.AES.encrypt(plainJsonStr, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const data = encrypted.ciphertext;
  const mac = CryptoJS.HmacSHA256(iv.clone().concat(data), key);
  return buildBackupEnvelope({
    salt: salt.toString(CryptoJS.enc.Base64),
    iv: iv.toString(CryptoJS.enc.Base64),
    data: data.toString(CryptoJS.enc.Base64),
    mac: mac.toString(CryptoJS.enc.Base64),
  });
}

// envelope JSON string + password -> plain backup JSON string (throws on wrong password/corruption)
export function decryptBackupPayload(envelopeStr: string, password: string): string {
  const env = parseBackupEnvelope(envelopeStr);
  const salt = CryptoJS.enc.Base64.parse(env.salt);
  const iv = CryptoJS.enc.Base64.parse(env.iv);
  const data = CryptoJS.enc.Base64.parse(env.data);
  const key = deriveKey(password, salt);
  try {
    const expectedMac = CryptoJS.HmacSHA256(iv.clone().concat(data), key).toString(
      CryptoJS.enc.Base64,
    );
    if (expectedMac !== env.mac) throw new Error('Invalid backup MAC');
    const decrypted = CryptoJS.AES.decrypt(
      CryptoJS.lib.CipherParams.create({ ciphertext: data }),
      key,
      { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 },
    );
    const plain = decrypted.toString(CryptoJS.enc.Utf8);
    if (!plain) throw new Error('Invalid backup plaintext');
    return plain;
  } catch (e) {
    throw new Error('Wrong password or corrupted backup');
  }
}
