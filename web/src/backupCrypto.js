// Password-based encryption for backup EXPORT FILES - separate from secureStorage.js, which
// encrypts data at rest with a key the user never sees or types. A backup file is meant to
// leave the browser (saved to Drive, emailed to yourself, kept on a USB drive), so it's
// protected with a password the user chooses and remembers instead - the app never stores
// this password anywhere. Uses PBKDF2 (100k iterations, SHA-256) to turn the password into an
// AES-256-GCM key, with a fresh random salt and IV per export so the same password never
// produces the same ciphertext twice.
const PBKDF2_ITERATIONS=100000;
const toB64=buf=>btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));

async function deriveKey(password,salt){
 const keyMaterial=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey(
  {name:'PBKDF2',salt,iterations:PBKDF2_ITERATIONS,hash:'SHA-256'},
  keyMaterial,
  {name:'AES-GCM',length:256},
  false,
  ['encrypt','decrypt']
 );
}

// plainJsonStr -> JSON-stringified envelope (safe to write straight to a downloaded file)
export async function encryptBackupPayload(plainJsonStr,password){
 const salt=crypto.getRandomValues(new Uint8Array(16));
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const key=await deriveKey(password,salt);
 const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(plainJsonStr));
 return JSON.stringify({
  encrypted:true,
  kdf:'PBKDF2-SHA256',
  iterations:PBKDF2_ITERATIONS,
  cipher:'AES-256-GCM',
  salt:toB64(salt),
  iv:toB64(iv),
  data:toB64(cipher)
 });
}

// envelope JSON string + password -> plain backup JSON string (throws on wrong password/corruption)
export async function decryptBackupPayload(envelopeStr,password){
 const env=JSON.parse(envelopeStr);
 const key=await deriveKey(password,fromB64(env.salt));
 try{
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(env.iv)},key,fromB64(env.data));
  return new TextDecoder().decode(plain);
 }catch(e){
  throw new Error('Wrong password or corrupted backup');
 }
}
