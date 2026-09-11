export const defaultCategories=[
{id:'salary',name:'Salary',icon:'💵',income:true},
{id:'food',name:'Food',icon:'🍔'},{id:'groceries',name:'Groceries',icon:'🛒'},{id:'home',name:'Home',icon:'🏠'},
{id:'transport',name:'Transport',icon:'🚗'},{id:'fuel',name:'Fuel',icon:'⛽'},{id:'medical',name:'Medical',icon:'💊'},
{id:'bills',name:'Bills',icon:'📱'},{id:'education',name:'Education',icon:'🎓'},{id:'shopping',name:'Shopping',icon:'👕'},
{id:'entertainment',name:'Entertainment',icon:'🎬'},{id:'travel',name:'Travel',icon:'✈️'},{id:'investment',name:'Investment',icon:'💰'},
{id:'gifts',name:'Gifts',icon:'🎁'},{id:'other',name:'Other',icon:'📦'}];
export const isIncomeCategory=(categories,id)=>categories.find(c=>c.id===id)?.income===true;
export const paymentMethods=['Cash','UPI','Credit Card','Debit Card','Bank Transfer'];

// preset avatars, no camera/gallery permission needed
export const avatarChoices=['🙂','😀','😎','🦁','🐱','🐶','🌸','⭐','💼','🎯','🧑\u200d💻','👩\u200d💻'];
export const defaultProfile={firstName:'',lastName:'',nickName:'',email:'',avatar:'🙂',avatarImage:''};

// no demo data; fresh install starts empty
export const emptyExpenses=[];

export const formatINR=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(n)||0);
export const total=xs=>xs.reduce((s,x)=>s+Number(x.amount||0),0);

// --- date / calendar helpers ---
export const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
export const weekdayLabels=['Su','Mo','Tu','We','Th','Fr','Sa'];
export const pad2=n=>String(n).padStart(2,'0');
export const dateKey=(y,m,d)=>`${y}-${pad2(m+1)}-${pad2(d)}`;
export const daysInMonth=(y,m)=>new Date(y,m+1,0).getDate();
export const firstWeekdayOfMonth=(y,m)=>new Date(y,m,1).getDay();
// 6x7 calendar grid for a given year/month (0-indexed)
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

// --- excel export helper ---
export const toExpenseRows=(expenses,categories)=>expenses.map(e=>({
 Date:e.date,
 Amount:Number(e.amount)||0,
 Category:categories.find(c=>c.id===e.category)?.name||e.category,
 Description:e.description||'',
 'Payment Method':e.paymentMethod||'',
 Note:e.note||''
}));

// --- backup / restore helpers ---
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
// detect encrypted vs legacy plain-JSON backup without fully parsing
export function isEncryptedBackupText(text){
 try{const obj=JSON.parse(text);return !!(obj&&obj.encrypted===true)}catch(e){return false}
}

// --- app lock helpers ---
export const defaultAppLock={enabled:false,mode:'pin',pin:''};
export const isValidPin=pin=>/^\d{4,6}$/.test(pin||'');

// --- recurring expenses ---
export const recurringFrequencies=['daily','weekly','monthly'];
export const frequencyLabels={daily:'Daily',weekly:'Weekly',monthly:'Monthly'};
export function nextDueDate(dateStr,frequency){
 const d=new Date(dateStr+'T00:00:00');
 if(frequency==='daily')d.setDate(d.getDate()+1);
 else if(frequency==='weekly')d.setDate(d.getDate()+7);
 else d.setMonth(d.getMonth()+1);
 return d.toISOString().slice(0,10);
}
// returns due occurrences (with catch-up) + advanced templates; pure, dedups via recurringId
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

// --- quick-add suggestions: repeated (description, category, amount) matches, ties broken by recency ---
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

// --- spending streaks ---
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
 // walk back from today/yesterday so an unlogged today doesn't zero the streak
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

// --- month/year-over-year comparison; expense categories only, monthStr is 'YYYY-MM' ---
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

// --- CSV/Excel import normalization: maps parsed rows to expense shape, matches category by name, skips invalid rows ---
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
