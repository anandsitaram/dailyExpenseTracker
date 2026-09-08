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
