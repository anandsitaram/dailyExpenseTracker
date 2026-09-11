// AES-GCM encryption at rest for localStorage. Key is non-extractable, kept in IndexedDB, used only via crypto.subtle. Doesn't protect against XSS in-origin.

const DB_NAME = 'det-secure',
  STORE = 'keys',
  KEY_ID = 'det-master-key';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getKey() {
  const db = await openDb();
  const existing = await new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readonly');
    const r = tx.objectStore(STORE).get(KEY_ID);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  if (existing) return existing;
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
  await new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(key, KEY_ID);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  return key;
}

const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function secureSet(key, value) {
  const cryptoKey = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(JSON.stringify(value));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, enc);
  localStorage.setItem(key, JSON.stringify({ iv: toB64(iv), data: toB64(cipher) }));
}

export async function secureGet(key, fallback = null) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    const { iv, data } = JSON.parse(raw);
    const cryptoKey = await getKey();
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromB64(iv) },
      cryptoKey,
      fromB64(data),
    );
    return JSON.parse(new TextDecoder().decode(plain));
  } catch (e) {
    console.error('secureStorage: failed to decrypt', key, e);
    return fallback;
  }
}
