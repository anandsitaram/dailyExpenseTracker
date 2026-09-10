export const defaultCategories=[
{id:'salary',name:'Salary',icon:'💵',income:true},
{id:'food',name:'Food',icon:'🍔'},{id:'groceries',name:'Groceries',icon:'🛒'},{id:'home',name:'Home',icon:'🏠'},
{id:'transport',name:'Transport',icon:'🚗'},{id:'fuel',name:'Fuel',icon:'⛽'},{id:'medical',name:'Medical',icon:'💊'},
{id:'bills',name:'Bills',icon:'📱'},{id:'education',name:'Education',icon:'🎓'},{id:'shopping',name:'Shopping',icon:'👕'},
{id:'entertainment',name:'Entertainment',icon:'🎬'},{id:'travel',name:'Travel',icon:'✈️'},{id:'investment',name:'Investment',icon:'💰'},
{id:'gifts',name:'Gifts',icon:'🎁'},{id:'other',name:'Other',icon:'📦'}];
export const isIncomeCategory=(categories,id)=>categories.find(c=>c.id===id)?.income===true;
export const paymentMethods=['Cash','UPI','Credit Card','Debit Card','Bank Transfer'];

// Preset avatar choices so users can personalize their profile without needing camera/gallery permissions.
export const avatarChoices=['🙂','😀','😎','🦁','🐱','🐶','🌸','⭐','💼','🎯','🧑\u200d💻','👩\u200d💻'];
export const defaultProfile={firstName:'',lastName:'',nickName:'',email:'',avatar:'🙂',avatarImage:''};

// No seeded/demo transactions - a fresh install starts empty and the UI guides the user to add their own data.
export const emptyExpenses=[];

export const formatINR=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(n)||0);
export const total=xs=>xs.reduce((s,x)=>s+Number(x.amount||0),0);

// --- shared date / calendar helpers (used by both web and mobile calendar views) ---
export const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
export const weekdayLabels=['Su','Mo','Tu','We','Th','Fr','Sa'];
export const pad2=n=>String(n).padStart(2,'0');
export const dateKey=(y,m,d)=>`${y}-${pad2(m+1)}-${pad2(d)}`;
export const daysInMonth=(y,m)=>new Date(y,m+1,0).getDate();
export const firstWeekdayOfMonth=(y,m)=>new Date(y,m,1).getDay();
// Builds a 6x7 grid of cells (some from prev/next month) for a given year/month (0-indexed month)
export function buildCalendarGrid(y,m){
 const total=daysInMonth(y,m),lead=firstWeekdayOfMonth(y,m);
 const prevTotal=daysInMonth(y,m-1<0?11:m-1);
 const prevYear=m-1<0?y-1:y, prevMonth=m-1<0?11:m-1;
 const nextYear=m+1>11?y+1:y, nextMonth=m+1>11?0:m+1;
 const cells=[];
 for(let i=lead-1;i>=0;i--)cells.push({day:prevTotal-i,y:prevYear,m:prevMonth,inMonth:false});
 for(let d=1;d<=total;d++)cells.push({day:d,y,m,inMonth:true});
 while(cells.length%7!==0||cells.length<42)cells.push({day:cells.length-lead-total+1,y:nextYear,m:nextMonth,inMonth:false});
 return cells;
}

// --- excel export helper (shared row-shaping logic; actual xlsx write happens per-platform) ---
export const toExpenseRows=(expenses,categories)=>expenses.map(e=>({
 Date:e.date,
 Amount:Number(e.amount)||0,
 Category:categories.find(c=>c.id===e.category)?.name||e.category,
 Description:e.description||'',
 'Payment Method':e.paymentMethod||'',
 Note:e.note||''
}));

// --- backup / restore helpers (shared JSON shape + validation, used by both platforms) ---
// A full local backup is the only way this fully-offline, no-server app can survive an
// uninstall/reinstall or a device switch - there is no account/cloud sync to fall back on.
export const BACKUP_VERSION=1;
export function buildBackupPayload({expenses,categories,budget,profile}){
 return JSON.stringify({app:'daily-expense-tracker',version:BACKUP_VERSION,exportedAt:new Date().toISOString(),expenses,categories,budget,profile},null,2);
}
export function parseBackupPayload(text){
 const data=JSON.parse(text);
 if(!data||!Array.isArray(data.expenses)||!Array.isArray(data.categories))throw new Error('Invalid backup file');
 return {
  expenses:data.expenses,
  categories:data.categories,
  budget:Number(data.budget)||0,
  profile:data.profile&&typeof data.profile==='object'?{...defaultProfile,...data.profile}:defaultProfile
 };
}
// Peeks at backup text without fully parsing it, to tell an encrypted envelope (produced by
// backupCrypto.js on each platform) apart from a legacy plain-JSON backup, before deciding
// whether a password is needed at all.
export function isEncryptedBackupText(text){
 try{const obj=JSON.parse(text);return !!(obj&&obj.encrypted===true)}catch(e){return false}
}

// --- app lock helpers (shared shape; platform-specific biometric wiring lives per-platform) ---
export const defaultAppLock={enabled:false,mode:'pin',pin:''};
export const isValidPin=pin=>/^\d{4,6}$/.test(pin||'');

// --- recurring expenses (shared date math + catch-up generation, used by both platforms) ---
export const recurringFrequencies=['daily','weekly','monthly'];
export const frequencyLabels={daily:'Daily',weekly:'Weekly',monthly:'Monthly'};
export function nextDueDate(dateStr,frequency){
 const d=new Date(dateStr+'T00:00:00');
 if(frequency==='daily')d.setDate(d.getDate()+1);
 else if(frequency==='weekly')d.setDate(d.getDate()+7);
 else d.setMonth(d.getMonth()+1);
 return d.toISOString().slice(0,10);
}
// Pure function: given the saved recurring templates and the expenses that already exist,
// works out which occurrences are due (from each template's start date up to `todayStr`,
// catching up on any that were missed while the app was closed) and returns the new expense
// rows to insert plus the templates with their `lastGeneratedDate` advanced. Doesn't mutate
// its inputs, and skips any date that's already been generated (checked via `recurringId`),
// so it's safe to call every time the app opens.
export function generateDueExpenses(templates,existingExpenses,todayStr){
 const newExpenses=[];
 const updatedTemplates=(templates||[]).map(t=>({...t}));
 for(const t of updatedTemplates){
  if(!t.active)continue;
  let due=t.lastGeneratedDate?nextDueDate(t.lastGeneratedDate,t.frequency):t.startDate;
  let guard=0;
  while(due<=todayStr&&guard<366){
   const exists=existingExpenses.some(e=>e.recurringId===t.id&&e.date===due)||newExpenses.some(e=>e.recurringId===t.id&&e.date===due);
   if(!exists){
    newExpenses.push({id:`${t.id}-${due}`,amount:t.amount,description:t.description,date:due,category:t.category,paymentMethod:t.paymentMethod,note:t.note,recurringId:t.id});
   }
   t.lastGeneratedDate=due;
   due=nextDueDate(due,t.frequency);
   guard++;
  }
 }
 return {newExpenses,updatedTemplates};
}

// --- quick-add suggestions (derived automatically from your own logging history - no setup) ---
// Groups expenses by an exact (description, category, amount) match, so a chip only appears
// once you've genuinely logged that same thing more than once - it's a reflection of real
// habits, not a manually curated list. Ties are broken by recency so the chips stay current.
export function computeQuickAddSuggestions(expenses,limit=6){
 const groups={};
 for(const e of expenses){
  const desc=(e.description||'').trim();
  if(!desc)continue;
  const key=desc.toLowerCase()+'|'+e.category+'|'+Number(e.amount);
  if(!groups[key])groups[key]={description:desc,category:e.category,amount:Number(e.amount),paymentMethod:e.paymentMethod,count:0,lastDate:e.date};
  groups[key].count++;
  if(e.date>groups[key].lastDate){groups[key].lastDate=e.date;groups[key].paymentMethod=e.paymentMethod}
 }
 return Object.values(groups)
  .filter(g=>g.count>=2)
  .sort((a,b)=>b.count-a.count||b.lastDate.localeCompare(a.lastDate))
  .slice(0,limit);
}

// --- spending streaks (consecutive calendar days with at least one expense logged) ---
export function computeStreaks(expenses,todayStr){
 const days=[...new Set(expenses.map(e=>e.date))].sort();
 if(!days.length)return {current:0,longest:0};
 let longest=1,run=1;
 for(let i=1;i<days.length;i++){
  const prev=new Date(days[i-1]+'T00:00:00'),cur=new Date(days[i]+'T00:00:00');
  const diffDays=Math.round((cur-prev)/86400000);
  if(diffDays===1){run++;longest=Math.max(longest,run)}
  else if(diffDays>1){run=1}
 }
 // current streak: walk back from today (or yesterday, so today not yet logged doesn't zero it out)
 const daySet=new Set(days);
 let current=0;
 let cursor=new Date(todayStr+'T00:00:00');
 if(!daySet.has(todayStr))cursor.setDate(cursor.getDate()-1);
 while(daySet.has(cursor.toISOString().slice(0,10))){
  current++;
  cursor.setDate(cursor.getDate()-1);
 }
 return {current,longest};
}

// --- month-over-month / year-over-year comparison (Analytics) ---
// All amounts are for non-income expense categories only, matching how the rest of the app
// defines "spending". monthStr is 'YYYY-MM'.
function monthTotal(expenses,categories,monthStr){
 return total(expenses.filter(e=>e.date.startsWith(monthStr)&&!isIncomeCategory(categories,e.category)));
}
function pctChange(prev,cur){
 if(prev===0)return cur===0?0:null; // null = undefined change (nothing to compare against)
 return ((cur-prev)/prev)*100;
}
export function computePeriodComparison(expenses,categories,todayStr){
 const [y,m]=todayStr.split('-').map(Number);
 const curMonth=`${y}-${pad2(m)}`;
 const prevDate=new Date(y,m-2,1); // month is 1-indexed here, JS Date month is 0-indexed
 const prevMonth=`${prevDate.getFullYear()}-${pad2(prevDate.getMonth()+1)}`;
 const lastYearMonth=`${y-1}-${pad2(m)}`;
 const curTotal=monthTotal(expenses,categories,curMonth);
 const prevTotal=monthTotal(expenses,categories,prevMonth);
 const lastYearTotal=monthTotal(expenses,categories,lastYearMonth);
 return {
  curMonth,prevMonth,lastYearMonth,
  curTotal,prevTotal,lastYearTotal,
  momPct:pctChange(prevTotal,curTotal),
  yoyPct:pctChange(lastYearTotal,curTotal)
 };
}

// --- CSV / Excel import row normalization (shared by both platforms' xlsx-based readers) ---
// Takes raw parsed rows (already turned into plain objects by XLSX.utils.sheet_to_json) and
// maps them onto our expense shape, matching category by name (case-insensitive) with a
// fallback, and skipping rows that don't have a usable amount/date. Returns both the usable
// rows and a count of skipped ones so the UI can report "imported 40, skipped 2".
export function normalizeImportedRows(rows,categories){
 const byName={};
 categories.forEach(c=>{byName[c.name.trim().toLowerCase()]=c.id});
 const fallbackCategory=categories.find(c=>!c.income)?.id||categories[0]?.id;
 const imported=[];
 let skipped=0;
 rows.forEach((r,i)=>{
  const get=(...keys)=>{for(const k of keys){for(const rk of Object.keys(r)){if(rk.trim().toLowerCase()===k)return r[rk]}}return undefined};
  const rawDate=get('date');
  const rawAmount=get('amount');
  const amount=Number(rawAmount);
  const dateStr=normalizeDate(rawDate);
  if(!dateStr||!amount||amount<=0){skipped++;return}
  const catName=(get('category')||'').toString().trim().toLowerCase();
  imported.push({
   id:'import-'+Date.now()+'-'+i,
   date:dateStr,
   amount,
   category:byName[catName]||fallbackCategory,
   description:(get('description')||'').toString(),
   paymentMethod:(get('payment method','paymentmethod')||'Cash').toString(),
   note:(get('note')||'').toString()
  });
 });
 return {imported,skipped};
}
function normalizeDate(v){
 if(!v)return null;
 if(v instanceof Date&&!isNaN(v))return v.toISOString().slice(0,10);
 const s=String(v).trim();
 if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
 const parsed=new Date(s);
 if(!isNaN(parsed))return parsed.toISOString().slice(0,10);
 return null;
}
