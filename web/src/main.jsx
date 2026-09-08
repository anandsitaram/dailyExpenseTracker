import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PieChart,Pie,Cell,Tooltip,ResponsiveContainer,LineChart,Line,XAxis,YAxis,CartesianGrid,BarChart,Bar} from 'recharts';
import * as XLSX from 'xlsx';
import {defaultCategories,paymentMethods,avatarChoices,defaultProfile,emptyExpenses,formatINR,total,monthNames,weekdayLabels,dateKey,buildCalendarGrid,toExpenseRows,isIncomeCategory,buildBackupPayload,parseBackupPayload} from './shared';
import {secureGet,secureSet} from './secureStorage';
import './style.css';

const PALETTE=['#8BC63E','#F5A623','#4C8EF7','#B98BF0','#F26D6D','#39B8A6'];
const today=()=>new Date().toISOString().slice(0,10);

function App(){
 const [expenses,setExpenses]=useState(emptyExpenses);
 const [categories,setCategories]=useState(defaultCategories);
 const [budget,setBudget]=useState(0);
 const [profile,setProfile]=useState(defaultProfile);
 const [loaded,setLoaded]=useState(false);
 const [tab,setTab]=useState('dashboard'),[editing,setEditing]=useState(null),[search,setSearch]=useState(''),[filter,setFilter]=useState('all');
 const [addPresetDate,setAddPresetDate]=useState(null);
 const [dateFrom,setDateFrom]=useState(''),[dateTo,setDateTo]=useState('');
 const now=new Date();
 const [calYear,setCalYear]=useState(now.getFullYear());
 const [calMonth,setCalMonth]=useState(now.getMonth());

 // Load once on mount (decrypting from IndexedDB-backed key + localStorage ciphertext).
 useEffect(()=>{(async()=>{
  const [e,c,b,p]=await Promise.all([
   secureGet('det-expenses',emptyExpenses),
   secureGet('det-categories',defaultCategories),
   secureGet('det-budget',0),
   secureGet('det-profile',defaultProfile)
  ]);
  setExpenses(e);setCategories(c);setBudget(Number(b)||0);setProfile({...defaultProfile,...p});setLoaded(true)
 })()},[]);
 // Guarded by `loaded` so we never encrypt-and-overwrite storage with the initial
 // placeholder state before the real data has finished loading.
 useEffect(()=>{if(loaded)secureSet('det-expenses',expenses).catch(console.error)},[expenses,loaded]);
 useEffect(()=>{if(loaded)secureSet('det-categories',categories).catch(console.error)},[categories,loaded]);
 useEffect(()=>{if(loaded)secureSet('det-budget',budget).catch(console.error)},[budget,loaded]);
 useEffect(()=>{if(loaded)secureSet('det-profile',profile).catch(console.error)},[profile,loaded]);

 const month=expenses.filter(e=>e.date.startsWith(today().slice(0,7)));
 const monthExpenseItems=month.filter(e=>!isIncomeCategory(categories,e.category));
 const monthIncomeItems=month.filter(e=>isIncomeCategory(categories,e.category));
 const monthTotal=total(monthExpenseItems);
 const monthIncomeTotal=total(monthIncomeItems);
 const remaining=budget-monthTotal;
 const byCat=useMemo(()=>categories.filter(c=>!c.income).map(c=>({name:c.name,value:total(monthExpenseItems.filter(e=>e.category===c.id))})).filter(x=>x.value),[monthExpenseItems,categories]);
 const daily=useMemo(()=>{let m={};monthExpenseItems.forEach(e=>m[e.date]=(m[e.date]||0)+Number(e.amount));return Object.entries(m).sort().map(([date,amount])=>({date:date.slice(5),amount}))},[monthExpenseItems]);
 const top=byCat.slice().sort((a,b)=>b.value-a.value)[0];
 const visible=expenses.filter(e=>
   (e.description+' '+e.note).toLowerCase().includes(search.toLowerCase())
   &&(filter==='all'||e.category===filter)
   &&(!dateFrom||e.date>=dateFrom)
   &&(!dateTo||e.date<=dateTo)
  ).sort((a,b)=>b.date.localeCompare(a.date));
 const dateFilterActive=dateFrom||dateTo;
 const singleDaySelected=dateFrom&&dateFrom===dateTo?dateFrom:null;

 const spendByDay=useMemo(()=>{const m={};expenses.forEach(e=>{m[e.date]=(m[e.date]||0)+Number(e.amount)});return m},[expenses]);

 function saveExpense(x){setExpenses(p=>editing?p.map(e=>e.id===x.id?x:e):[x,...p]);setEditing(null);setTab('expenses')}
 function remove(id){if(confirm('Delete this expense?'))setExpenses(p=>p.filter(e=>e.id!==id))}
 function startAdd(presetDate){setEditing(null);setAddPresetDate(presetDate||null);setTab('add')}
 function startEdit(x){setEditing(x);setAddPresetDate(null);setTab('add')}
 // Tapping a day on the dashboard calendar goes straight to Add expense (preset to that date)
 // instead of routing through the Expenses tab.
 function openDay(d){startAdd(d)}

 function exportCSV(){
  const rows=[['Date','Amount','Category','Description','Payment Method','Note'],...expenses.map(e=>[e.date,e.amount,categories.find(c=>c.id===e.category)?.name||'',e.description,e.paymentMethod,e.note||''])];
  const blob=new Blob([rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n')],{type:'text/csv'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='daily-expenses.csv';a.click()
 }
 function exportExcel(){
  const rows=toExpenseRows(expenses,categories);
  const ws=XLSX.utils.json_to_sheet(rows);
  ws['!cols']=[{wch:12},{wch:10},{wch:14},{wch:28},{wch:16},{wch:24}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Expenses');
  XLSX.writeFile(wb,'daily-expenses.xlsx');
 }
 // Full data backup - this app is fully offline with no account or server, so this file is the
 // only thing that can carry your data across clearing browser data or switching devices.
 function exportBackup(){
  const payload=buildBackupPayload({expenses,categories,budget,profile});
  const blob=new Blob([payload],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='daily-expense-backup.json';a.click();
 }
 function importBackup(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
   let data;
   try{data=parseBackupPayload(reader.result)}catch(err){alert("That doesn't look like a valid backup file.");return}
   if(!confirm('This replaces everything currently in the app with the backup data. This cannot be undone. Continue?'))return;
   setExpenses(data.expenses);setCategories(data.categories.length?data.categories:defaultCategories);setBudget(data.budget);setProfile(data.profile);
   alert('Restored from backup.');
  };
  reader.readAsText(file);
  e.target.value='';
 }

 if(!loaded)return <div className="app"><main style={{padding:40}}>Loading your data…</main></div>;

 return <div className="app">
  <aside>
   <div className="brand"><span className="mark">💰</span><span>DailyExpense</span></div>
   <div className="nav">{[['dashboard','⌂','Dashboard'],['expenses','☷','Expenses'],['analytics','◔','Analytics'],['budget','◎','Budget'],['categories','◇','Categories'],['profile','☺','Profile']].map(x=>
    <button key={x[0]} className={tab===x[0]?'active':''} onClick={()=>setTab(x[0])}><b>{x[1]}</b>{x[2]}</button>)}
   </div>
   <div className="sideCard"><h4>Upgrade to Pro</h4><p>Full history sync & insights.</p><button className="accent" style={{width:'100%'}}>Upgrade now</button></div>
  </aside>
  <main>
   <header>
    <div className="headerTitle">
     <div className="avatarPreview small">{profile.avatarImage?<img src={profile.avatarImage} alt="Profile"/>:<span>{profile.avatar||'🙂'}</span>}</div>
     <div><div className="eyebrow">PERSONAL FINANCE</div><h1>{tab==='dashboard'?(profile.nickName?`Hi ${profile.nickName} 👋`:'Hi there! 👋'):tab[0].toUpperCase()+tab.slice(1)}</h1><p>Track everyday spending without the clutter.</p></div>
    </div>
    <div className="headerActions"><button className="primary" onClick={()=>startAdd()}>＋ Add expense</button></div>
   </header>

   {tab==='dashboard'&&<>
    <section className="cards">
     <Metric title="Expenses" value={formatINR(monthTotal)} highlight/>
     <Metric title="Remaining balance" value={budget>0?formatINR(remaining):'—'} highlight warn={budget>0&&remaining<0}/>
     <Metric title="Income this month" value={formatINR(monthIncomeTotal)}/>
     <Metric title="Top category" value={top?.name||'—'}/>
    </section>
    {budget<=0&&<p className="hint" style={{marginTop:-10,marginBottom:14}}><button className="mini" onClick={()=>setTab('budget')}>Set a monthly budget</button> to see your remaining balance.</p>}
    <div className="grid">
     <Panel title="Spending trend">{daily.length?<Trend data={daily}/>:<EmptyState icon="📈" text="No spending yet this month."/>}</Panel>
     <Panel title="Category breakdown">{byCat.length?<Donut data={byCat}/>:<EmptyState icon="📊" text="No spending yet this month."/>}</Panel>
    </div>
    <div className="grid">
     <Panel title="Calendar">
      <CalendarView
       year={calYear} month={calMonth}
       spendByDay={spendByDay}
       onSelectDay={openDay}
       onPrev={()=>{if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1)}else setCalMonth(m=>m-1)}}
       onNext={()=>{if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1)}else setCalMonth(m=>m+1)}}
      />
      <p className="hint">Tap any day to add an expense for that date.</p>
     </Panel>
     <Panel title="Recent expenses">
      {expenses.length?
       <ExpenseList items={expenses.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6)} cats={categories} onEdit={startEdit} onDelete={remove}/>:
       <EmptyState icon="🧾" text="No expenses yet. Add your first one to see it here." actionLabel="＋ Add expense" onAction={()=>startAdd()}/>}
     </Panel>
    </div>
   </>}

   {tab==='expenses'&&<Panel title="Expense history">
    <div className="toolbar">
     <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search description or note"/>
     <select value={filter} onChange={e=>setFilter(e.target.value)}>
      <option value="all">All categories</option>
      {categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
     </select>
     <label className="inlineDate">From<input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/></label>
     <label className="inlineDate">To<input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}/></label>
     {dateFilterActive&&<button className="mini" onClick={()=>{setDateFrom('');setDateTo('')}}>Clear dates</button>}
     {expenses.length>0&&<>
      <button onClick={exportCSV}>Export CSV</button>
      <button onClick={exportExcel}>Export Excel</button>
     </>}
    </div>
    {singleDaySelected&&<div className="panelHead" style={{marginTop:-6}}>
     <span className="hint" style={{margin:0}}>Showing {singleDaySelected} · {formatINR(total(visible))} total</span>
     <button className="primary mini" onClick={()=>startAdd(singleDaySelected)}>＋ Add expense for this date</button>
    </div>}
    {visible.length?
     <ExpenseList items={visible} cats={categories} onEdit={startEdit} onDelete={remove}/>:
     (expenses.length?<EmptyState icon="🔍" text="No expenses match these filters."/>:
      <EmptyState icon="🧾" text="You haven't added any expenses yet." actionLabel="＋ Add expense" onAction={()=>startAdd()}/>)}
   </Panel>}

   {tab==='add'&&<ExpenseForm key={editing?editing.id:('new-'+(addPresetDate||''))} initial={editing} presetDate={addPresetDate} cats={categories} allExpenses={expenses} onEditExpense={startEdit} onDeleteExpense={remove} onCancel={()=>setTab('expenses')} onSave={saveExpense}/>}

   {tab==='analytics'&&<>
    <div className="grid">
     <Panel title="Category spending">{byCat.length?<Donut data={byCat}/>:<EmptyState icon="📊" text="No spending yet this month. Add an expense to see the breakdown."/>}</Panel>
     <Panel title="Daily spending">{daily.length?<Trend data={daily}/>:<EmptyState icon="📅" text="No spending yet this month."/>}</Panel>
    </div>
    <Panel title="Monthly overview (income vs expense)"><MonthlyBars expenses={expenses} categories={categories}/></Panel>
   </>}

   {tab==='budget'&&<Budget budget={budget} setBudget={setBudget} spent={monthTotal}/>}
   {tab==='categories'&&<CategoryManager cats={categories} setCats={setCategories}/>}
   {tab==='profile'&&<>
    <Profile profile={profile} setProfile={setProfile}/>
    <Panel title="Backup & restore">
     <p className="hint" style={{margin:'0 0 14px'}}>This app keeps everything private in your browser only - there's no account or cloud sync. That means clearing browser data (or reinstalling on mobile) can erase your data. Export a backup first, then restore it here whenever you need to bring your data back.</p>
     <div className="toolbar">
      <button className="primary" onClick={exportBackup}>⬇ Export backup</button>
      <label className="mini fileBtn">⬆ Restore from file<input type="file" accept="application/json" style={{display:'none'}} onChange={importBackup}/></label>
     </div>
    </Panel>
   </>}
  </main>
 </div>
}

const Metric=({title,value,highlight,warn})=><div className={'card'+(highlight?' highlight':'')+(warn?' warn':'')}><span>{title}</span><strong>{value}</strong></div>;
const Panel=({title,children})=><section className="panel"><div className="panelHead"><h2>{title}</h2></div>{children}</section>;
const EmptyState=({icon,text,actionLabel,onAction})=><div className="empty"><div className="emptyIcon">{icon}</div><p>{text}</p>{actionLabel&&<button className="primary mini" onClick={onAction}>{actionLabel}</button>}</div>;

function ExpenseList({items,cats,onEdit,onDelete}){
 return <div>
  {items.map(e=>{
   const c=cats.find(c=>c.id===e.category);
   return <div className="expense" key={e.id}>
    <span className="icon">{c?.icon||'📦'}</span>
    <div className="grow"><b>{e.description||c?.name||'Uncategorized'}</b><small>{c?.name||'Uncategorized'} · {e.date} · {e.paymentMethod}</small></div>
    <strong>{formatINR(e.amount)}</strong>
    <button className="mini" onClick={()=>onEdit(e)}>Edit</button>
    <button className="mini danger" onClick={()=>onDelete(e.id)}>Delete</button>
   </div>
  })}
  {!items.length&&<div className="empty">No expenses found.</div>}
 </div>
}

function ExpenseForm({initial,presetDate,cats,allExpenses,onEditExpense,onDeleteExpense,onCancel,onSave}){
 const [f,setF]=useState(initial||{id:null,date:presetDate||today(),amount:'',category:cats[0]?.id,description:'',paymentMethod:'UPI',note:''});
 const set=(k,v)=>setF({...f,[k]:v});
 // Shown below the form so tapping a calendar date still gives visibility into what's
 // already logged that day, without a detour through the Expenses tab.
 const sameDay=(allExpenses||[]).filter(e=>e.date===f.date&&e.id!==f.id).sort((a,b)=>b.date.localeCompare(a.date));
 return <>
  <Panel title={initial?'Edit expense':'Add expense'}>
   <form className="form" onSubmit={e=>{e.preventDefault();if(Number(f.amount)>0)onSave({...f,amount:Number(f.amount),id:f.id||Date.now().toString()})}}>
    <label>Amount (₹)<input autoFocus type="number" min="1" value={f.amount} onChange={e=>set('amount',e.target.value)} required/></label>
    <label>Date<input type="date" value={f.date} onChange={e=>set('date',e.target.value)} required/></label>
    <label>Category<select value={f.category} onChange={e=>set('category',e.target.value)}>{cats.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></label>
    <label>Payment method<select value={f.paymentMethod} onChange={e=>set('paymentMethod',e.target.value)}>{paymentMethods.map(x=><option key={x}>{x}</option>)}</select></label>
    <label className="wide">Description<input value={f.description} onChange={e=>set('description',e.target.value)} placeholder="e.g. Lunch with family"/></label>
    <label className="wide">Notes<textarea value={f.note} onChange={e=>set('note',e.target.value)} placeholder="Optional note"/></label>
    <div className="actions"><button type="button" onClick={onCancel}>Cancel</button><button className="primary">{initial?'Save changes':'Add expense'}</button></div>
   </form>
  </Panel>
  {sameDay.length>0&&<Panel title={`Other expenses on ${f.date}`}>
   <ExpenseList items={sameDay} cats={cats} onEdit={onEditExpense} onDelete={onDeleteExpense}/>
  </Panel>}
 </>
}

function CategoryManager({cats,setCats}){
 const [name,setName]=useState('');
 function add(){if(!name.trim())return;setCats([...cats,{id:'custom-'+Date.now(),name:name.trim(),icon:'🏷️'}]);setName('')}
 function removeCat(id){setCats(cats.filter(c=>c.id!==id))}
 return <Panel title="Categories">
  <div className="toolbar"><input value={name} onChange={e=>setName(e.target.value)} placeholder="New category name"/><button className="primary" onClick={add}>＋ Add category</button></div>
  <div className="catGrid">{cats.map(c=><div className="cat" key={c.id}><span>{c.icon}</span><b>{c.name}</b>{c.id.startsWith('custom-')&&<button className="mini danger" style={{marginLeft:'auto'}} onClick={()=>removeCat(c.id)}>✕</button>}</div>)}</div>
 </Panel>
}

function Profile({profile,setProfile}){
 const set=(k,v)=>setProfile({...profile,[k]:v});
 function onPickImage(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>setProfile(p=>({...p,avatarImage:reader.result}));
  reader.readAsDataURL(file);
  e.target.value='';
 }
 return <Panel title="Profile">
  <div className="avatarRow">
   <div className="avatarPreview">{profile.avatarImage?<img src={profile.avatarImage} alt="Profile"/>:<span>{profile.avatar||'🙂'}</span>}</div>
   <div className="avatarActions">
    <label className="mini fileBtn">Upload photo<input type="file" accept="image/*" style={{display:'none'}} onChange={onPickImage}/></label>
    {profile.avatarImage&&<button className="mini danger" onClick={()=>set('avatarImage','')}>Remove photo</button>}
   </div>
  </div>
  <div className="avatarPicker">
   {avatarChoices.map(em=><button type="button" key={em} className={'avatarChip'+(profile.avatar===em&&!profile.avatarImage?' selected':'')} onClick={()=>{set('avatar',em);set('avatarImage','')}}>{em}</button>)}
  </div>
  <div className="form">
   <label>First name<input value={profile.firstName||''} onChange={e=>set('firstName',e.target.value)} placeholder="Jane"/></label>
   <label>Last name<input value={profile.lastName||''} onChange={e=>set('lastName',e.target.value)} placeholder="Doe"/></label>
   <label>Nickname<input value={profile.nickName||''} onChange={e=>set('nickName',e.target.value)} placeholder="How the dashboard greets you"/></label>
   <label>Email<input type="email" value={profile.email||''} onChange={e=>set('email',e.target.value)} placeholder="jane@example.com"/></label>
  </div>
  <p className="hint">Saved automatically, and encrypted at rest like the rest of your data. Set a nickname to personalize your dashboard greeting.</p>
 </Panel>
}

function Budget({budget,setBudget,spent}){
 const pct=budget>0?Math.min(100,spent/budget*100):0;
 const remaining=budget-spent;
 return <Panel title="Monthly budget">
  <div className="budgetTop"><div><span>Spent</span><h2>{formatINR(spent)}</h2></div><div><span>Budget</span><input className="budgetInput" type="number" placeholder="Enter your monthly budget" value={budget||''} onChange={e=>setBudget(Number(e.target.value)||0)}/></div></div>
  {budget>0?<>
   <div className={'progress'+(pct>=80?' warn':'')}><i style={{width:pct+'%'}}/></div>
   <div className="budgetMeta"><b>{pct.toFixed(0)}% used</b><span>{formatINR(Math.max(0,remaining))} remaining</span></div>
   {pct>=80&&<div className="alert">⚠️ You are approaching your monthly budget.</div>}
  </>:<p className="hint">Set a budget above to track your spending against it.</p>}
 </Panel>
}

const Donut=({data})=><div className="chart"><ResponsiveContainer><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95}>{data.map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]}/>)}</Pie><Tooltip formatter={v=>formatINR(v)}/></PieChart></ResponsiveContainer></div>;
const Trend=({data})=><div className="chart"><ResponsiveContainer><LineChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#EAEDE3"/><XAxis dataKey="date"/><YAxis/><Tooltip formatter={v=>formatINR(v)}/><Line type="monotone" dataKey="amount" stroke="#8BC63E" strokeWidth={3} dot={false}/></LineChart></ResponsiveContainer></div>;
function MonthlyBars({expenses,categories}){
 let m={};expenses.forEach(e=>{
  let k=e.date.slice(0,7);
  if(!m[k])m[k]={month:k,expense:0,income:0};
  if(isIncomeCategory(categories,e.category))m[k].income+=Number(e.amount);
  else m[k].expense+=Number(e.amount);
 });
 let d=Object.values(m).sort((a,b)=>a.month.localeCompare(b.month)).slice(-6);
 if(!d.length)return <EmptyState icon="📈" text="No data yet. Start adding expenses or income to see monthly trends."/>;
 return <div className="chart"><ResponsiveContainer><BarChart data={d}><CartesianGrid strokeDasharray="3 3" stroke="#EAEDE3"/><XAxis dataKey="month"/><YAxis/><Tooltip formatter={v=>formatINR(v)}/><Bar dataKey="expense" name="Expense" fill="#8BC63E" radius={[6,6,0,0]}/><Bar dataKey="income" name="Income" fill="#F5A623" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div>
}

function CalendarView({year,month,spendByDay,onSelectDay,onPrev,onNext}){
 const cells=useMemo(()=>buildCalendarGrid(year,month),[year,month]);
 const todayKey=today();
 return <div className="calendar">
  <div className="panelHead">
   <h2 style={{fontSize:14}}>{monthNames[month]} {year}</h2>
   <div className="navBtns"><button onClick={onPrev}>‹</button><button onClick={onNext}>›</button></div>
  </div>
  <div className="calGrid">
   {weekdayLabels.map(w=><div className="calDow" key={w}>{w}</div>)}
   {cells.map((c,i)=>{
    const key=dateKey(c.y,c.m,c.day);
    const amt=spendByDay[key];
    return <div key={i}
     className={'calCell'+(c.inMonth?'':' outMonth')+(key===todayKey?' today':'')+(amt?' hasSpend':'')}
     onClick={()=>c.inMonth&&onSelectDay(key)}>
     <span className="calDay">{c.day}</span>
     {amt?<span className="calAmt">{formatINR(amt).replace('₹','')}</span>:null}
    </div>
   })}
  </div>
 </div>
}

createRoot(document.getElementById('root')).render(<App/>);
