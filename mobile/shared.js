export const defaultCategories=[
{id:'salary',name:'Salary',icon:'💵',income:true},
{id:'food',name:'Food',icon:'🍔'},{id:'groceries',name:'Groceries',icon:'🛒'},{id:'home',name:'Home',icon:'🏠'},
{id:'transport',name:'Transport',icon:'🚗'},{id:'fuel',name:'Fuel',icon:'⛽'},{id:'medical',name:'Medical',icon:'💊'},
{id:'bills',name:'Bills',icon:'📱'},{id:'education',name:'Education',icon:'🎓'},{id:'shopping',name:'Shopping',icon:'👕'},
{id:'entertainment',name:'Entertainment',icon:'🎬'},{id:'travel',name:'Travel',icon:'✈️'},{id:'investment',name:'Investment',icon:'💰'},
{id:'gifts',name:'Gifts',icon:'🎁'},{id:'other',name:'Other',icon:'📦'}];
export const isIncomeCategory=(categories,id)=>categories.find(c=>c.id===id)?.income===true;
export const paymentMethods=['Cash','UPI','Credit Card','Debit Card','Bank Transfer'];
export const demoExpenses=[
{id:'1',date:'2026-09-06',amount:350,category:'food',description:'Breakfast',paymentMethod:'UPI',note:''},
{id:'2',date:'2026-09-05',amount:850,category:'groceries',description:'Weekly groceries',paymentMethod:'UPI',note:''},
{id:'3',date:'2026-09-05',amount:200,category:'transport',description:'Auto',paymentMethod:'Cash',note:''},
{id:'4',date:'2026-09-04',amount:1200,category:'bills',description:'Internet bill',paymentMethod:'UPI',note:''},
{id:'5',date:'2026-09-03',amount:2400,category:'shopping',description:'Clothing',paymentMethod:'Credit Card',note:''},
{id:'6',date:'2026-09-02',amount:600,category:'food',description:'Dinner',paymentMethod:'UPI',note:''},
{id:'7',date:'2026-09-01',amount:1500,category:'fuel',description:'Fuel',paymentMethod:'Debit Card',note:''}];
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
