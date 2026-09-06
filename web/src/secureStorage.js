// Encrypts data at rest in localStorage using AES-GCM.
// The AES key itself is generated non-extractable and kept in IndexedDB, so no JS
// (including this file) can ever read the raw key bytes - only use it via
// crypto.subtle.encrypt/decrypt. This protects the data from anything that reads
// browser storage files directly outside the page (extensions inspecting storage,
// disk/forensic access, a shared/borrowed device). It does NOT protect against
// malicious script running inside this same page's origin (XSS) - no client-only
// storage scheme can, since that script could call subtle.decrypt too.

const DB_NAME='det-secure',STORE='keys',KEY_ID='det-master-key';

function openDb(){
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB_NAME,1);
  req.onupgradeneeded=()=>req.result.createObjectStore(STORE);
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error);
 });
}

async function getKey(){
 const db=await openDb();
 const existing=await new Promise((res,rej)=>{
  const tx=db.transaction(STORE,'readonly');
  const r=tx.objectStore(STORE).get(KEY_ID);
  r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);
 });
 if(existing)return existing;
 const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 await new Promise((res,rej)=>{
  const tx=db.transaction(STORE,'readwrite');
  tx.objectStore(STORE).put(key,KEY_ID);
  tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);
 });
 return key;
}

const toB64=buf=>btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));

export async function secureSet(key,value){
 const cryptoKey=await getKey();
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const enc=new TextEncoder().encode(JSON.stringify(value));
 const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},cryptoKey,enc);
 localStorage.setItem(key,JSON.stringify({iv:toB64(iv),data:toB64(cipher)}));
}

export async function secureGet(key,fallback=null){
 const raw=localStorage.getItem(key);
 if(!raw)return fallback;
 try{
  const {iv,data}=JSON.parse(raw);
  const cryptoKey=await getKey();
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(iv)},cryptoKey,fromB64(data));
  return JSON.parse(new TextDecoder().decode(plain));
 }catch(e){
  console.error('secureStorage: failed to decrypt',key,e);
  return fallback;
 }
}
