export const defaultCategories=[
{id:'food',name:'Food',icon:'🍔'},{id:'groceries',name:'Groceries',icon:'🛒'},{id:'home',name:'Home',icon:'🏠'},
{id:'transport',name:'Transport',icon:'🚗'},{id:'fuel',name:'Fuel',icon:'⛽'},{id:'medical',name:'Medical',icon:'💊'},
{id:'bills',name:'Bills',icon:'📱'},{id:'education',name:'Education',icon:'🎓'},{id:'shopping',name:'Shopping',icon:'👕'},
{id:'entertainment',name:'Entertainment',icon:'🎬'},{id:'travel',name:'Travel',icon:'✈️'},{id:'investment',name:'Investment',icon:'💰'},
{id:'gifts',name:'Gifts',icon:'🎁'},{id:'other',name:'Other',icon:'📦'}];
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
