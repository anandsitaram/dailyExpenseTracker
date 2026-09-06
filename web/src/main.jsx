import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PieChart,Pie,Cell,Tooltip,ResponsiveContainer,LineChart,Line,XAxis,YAxis,CartesianGrid,BarChart,Bar} from 'recharts';
import * as XLSX from 'xlsx';
import {defaultCategories,paymentMethods,demoExpenses,formatINR,total,monthNames,weekdayLabels,dateKey,buildCalendarGrid,toExpenseRows} from './shared';
import {secureGet,secureSet} from './secureStorage';
import './style.css';

const PALETTE=['#8BC63E','#F5A623','#4C8EF7','#B98BF0','#F26D6D','#39B8A6'];
const today=()=>new Date().toISOString().slice(0,10);

function App(){
 const [expenses,setExpenses]=useState(demoExpenses);
 const [categories,setCategories]=useState(defaultCategories);
 const [budget,setBudget]=useState(40000);
 const [loaded,setLoaded]=useState(false);
 const [tab,setTab]=useState('dashboard'),[prevTab,setPrevTab]=useState('dashboard'),[editing,setEditing]=useState(null),[search,setSearch]=useState(''),[filter,setFilter]=useState('all');
 const [dateFrom,setDateFrom]=useState(''),[dateTo,setDateTo]=useState('');
 const now=new Date();
 const [calYear,setCalYear]=useState(now.getFullYear());
 const [calMonth,setCalMonth]=useState(now.getMonth());
 const [selectedDay,setSelectedDay]=useState(null);

 // Load once on mount (decrypting from IndexedDB-backed key + localStorage ciphertext).
 useEffect(()=>{(async()=>{
  const [e,c,b]=await Promise.all([
   secureGet('det-expenses',demoExpenses),
   secureGet('det-categories',defaultCategories),
   secureGet('det-budget',40000)
  ]);
  setExpenses(e);setCategories(c);setBudget(b);setLoaded(true)
 })()},[]);
 // Guarded by `loaded` so we never encrypt-and-overwrite storage with the initial
 // placeholder state before the real data has finished loading.
 useEffect(()=>{if(loaded)secureSet('det-expenses',expenses).catch(console.error)},[expenses,loaded]);
 useEffect(()=>{if(loaded)secureSet('det-categories',categories).catch(console.error)},[categories,loaded]);
 useEffect(()=>{if(loaded)secureSet('det-budget',budget).catch(console.error)},[budget,loaded]);

 const month=expenses.filter(e=>e.date.startsWith(today().slice(0,7))); const monthTotal=total(month);
 const byCat=useMemo(()=>categories.map(c=>({name:c.name,value:total(month.filter(e=>e.category===c.id))})).filter(x=>x.value),[month,categories]);
 const daily=useMemo(()=>{let m={};month.forEach(e=>m[e.date]=(m[e.date]||0)+Number(e.amount));return Object.entries(m).sort().map(([date,amount])=>({date:date.slice(5),amount}))},[month]);
 const top=byCat.slice().sort((a,b)=>b.value-a.value)[0];
 const visible=expenses.filter(e=>
   (e.description+' '+e.note).toLowerCase().includes(search.toLowerCase())
   &&(filter==='all'||e.category===filter)
   &&(!dateFrom||e.date>=dateFrom)
   &&(!dateTo||e.date<=dateTo)
  ).sort((a,b)=>b.date.localeCompare(a.date));
 const dateFilterActive=dateFrom||dateTo;

 const spendByDay=useMemo(()=>{const m={};expenses.forEach(e=>{m[e.date]=(m[e.date]||0)+Number(e.amount)});return m},[expenses]);
 const selectedDayExpenses=useMemo(()=>selectedDay?expenses.filter(e=>e.date===selectedDay).sort((a,b)=>b.date.localeCompare(a.date)):null,[selectedDay,expenses]);

 function saveExpense(x){setExpenses(p=>editing?p.map(e=>e.id===x.id?x:e):[x,...p]);setEditing(null);setTab('expenses')}
 function remove(id){if(confirm('Delete this expense?'))setExpenses(p=>p.filter(e=>e.id!==id))}
 function startAdd(){setEditing(null);setTab('add')}
 function startEdit(x){setEditing(x);setTab('add')}
 function openDay(d){setSelectedDay(d);setPrevTab(tab==='daydetail'?prevTab:tab);setTab('daydetail')}
 function closeDay(){setTab(prevTab);setSelectedDay(null)}

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

 if(!loaded)return <div className="app"><main style={{padding:40}}>Loading your data…</main></div>;

 return <div className="app">
  <aside>
   <div className="brand"><span className="mark">💰</span><span>DailyExpense</span></div>
   <div className="nav">{[['dashboard','⌂','Dashboard'],['expenses','☷','Expenses'],['analytics','◔','Analytics'],['budget','◎','Budget'],['categories','◇','Categories']].map(x=>
    <button key={x[0]} className={tab===x[0]?'active':''} onClick={()=>setTab(x[0])}><b>{x[1]}</b>{x[2]}</button>)}
   </div>
   <div className="sideCard"><h4>Upgrade to Pro</h4><p>Full history sync & insights.</p><button className="accent" style={{width:'100%'}}>Upgrade now</button></div>
  </aside>
  <main>
   <header>
    <div><div className="eyebrow">PERSONAL FINANCE</div><h1>{tab==='dashboard'?'Good morning 👋':tab==='daydetail'?'Day detail':tab[0].toUpperCase()+tab.slice(1)}</h1><p>Track everyday spending without the clutter.</p></div>
    <div className="headerActions"><button className="primary" onClick={startAdd}>＋ Add expense</button></div>
   </header>

   {tab==='dashboard'&&<>
    <section className="cards">
     <Metric title="This month" value={formatINR(monthTotal)}/>
     <Metric title="Transactions" value={month.length}/>
     <Metric title="Avg. transaction" value={formatINR(month.length?monthTotal/month.length:0)}/>
     <Metric title="Top category" value={top?.name||'—'}/>
    </section>
    <div className="grid">
     <Panel title="Spending trend"><Trend data={daily}/></Panel>
     <Panel title="Category breakdown"><Donut data={byCat}/></Panel>
    </div>
    <div className="grid">
     <Panel title="Calendar">
      <CalendarView
       year={calYear} month={calMonth}
       spendByDay={spendByDay}
       selectedDay={null}
       onSelectDay={openDay}
       onPrev={()=>{if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1)}else setCalMonth(m=>m-1)}}
       onNext={()=>{if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1)}else setCalMonth(m=>m+1)}}
      />
      <p className="hint">Tap any day to open its expenses.</p>
     </Panel>
     <Panel title="Recent expenses">
      <ExpenseList items={expenses.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6)} cats={categories} onEdit={startEdit} onDelete={remove}/>
     </Panel>
    </div>
   </>}

   {tab==='daydetail'&&<Panel title={selectedDay}>
    <div className="panelHead" style={{marginTop:-8,marginBottom:16}}>
     <button className="mini" onClick={closeDay}>← Back</button>
     <strong>{formatINR(total(selectedDayExpenses||[]))} total</strong>
    </div>
    <ExpenseList items={selectedDayExpenses||[]} cats={categories} onEdit={startEdit} onDelete={remove}/>
   </Panel>}

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
     <button onClick={exportCSV}>Export CSV</button>
     <button onClick={exportExcel}>Export Excel</button>
    </div>
    <ExpenseList items={visible} cats={categories} onEdit={startEdit} onDelete={remove}/>
   </Panel>}

   {tab==='add'&&<ExpenseForm key={editing?editing.id:'new'} initial={editing} cats={categories} onCancel={()=>setTab('expenses')} onSave={saveExpense}/>}

   {tab==='analytics'&&<>
    <div className="grid">
     <Panel title="Category spending"><Donut data={byCat}/></Panel>
     <Panel title="Daily spending"><Trend data={daily}/></Panel>
    </div>
    <Panel title="Monthly overview"><MonthlyBars expenses={expenses}/></Panel>
   </>}

   {tab==='budget'&&<Budget budget={budget} setBudget={setBudget} spent={monthTotal}/>}
   {tab==='categories'&&<CategoryManager cats={categories} setCats={setCategories}/>}
  </main>
 </div>
}

const Metric=({title,value})=><div className="card"><span>{title}</span><strong>{value}</strong></div>;
const Panel=({title,children})=><section className="panel"><div className="panelHead"><h2>{title}</h2></div>{children}</section>;

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

function ExpenseForm({initial,cats,onCancel,onSave}){
 const [f,setF]=useState(initial||{id:null,date:today(),amount:'',category:cats[0]?.id,description:'',paymentMethod:'UPI',note:''});
 const set=(k,v)=>setF({...f,[k]:v});
 return <Panel title={initial?'Edit expense':'Add expense'}>
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

function Budget({budget,setBudget,spent}){
 const pct=budget>0?Math.min(100,spent/budget*100):0;
 return <Panel title="Monthly budget">
  <div className="budgetTop"><div><span>Spent</span><h2>{formatINR(spent)}</h2></div><div><span>Budget</span><input className="budgetInput" type="number" value={budget} onChange={e=>setBudget(Number(e.target.value)||0)}/></div></div>
  <div className={'progress'+(pct>=80?' warn':'')}><i style={{width:pct+'%'}}/></div>
  <div className="budgetMeta"><b>{pct.toFixed(0)}% used</b><span>{formatINR(Math.max(0,budget-spent))} remaining</span></div>
  {pct>=80&&<div className="alert">⚠️ You are approaching your monthly budget.</div>}
 </Panel>
}

const Donut=({data})=><div className="chart"><ResponsiveContainer><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95}>{data.map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]}/>)}</Pie><Tooltip formatter={v=>formatINR(v)}/></PieChart></ResponsiveContainer></div>;
const Trend=({data})=><div className="chart"><ResponsiveContainer><LineChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#EAEDE3"/><XAxis dataKey="date"/><YAxis/><Tooltip formatter={v=>formatINR(v)}/><Line type="monotone" dataKey="amount" stroke="#8BC63E" strokeWidth={3} dot={false}/></LineChart></ResponsiveContainer></div>;
function MonthlyBars({expenses}){
 let m={};expenses.forEach(e=>{let k=e.date.slice(0,7);m[k]=(m[k]||0)+Number(e.amount)});
 let d=Object.entries(m).sort().slice(-6).map(([month,amount])=>({month,amount}));
 return <div className="chart"><ResponsiveContainer><BarChart data={d}><CartesianGrid strokeDasharray="3 3" stroke="#EAEDE3"/><XAxis dataKey="month"/><YAxis/><Tooltip formatter={v=>formatINR(v)}/><Bar dataKey="amount" fill="#8BC63E" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div>
}

function CalendarView({year,month,spendByDay,selectedDay,onSelectDay,onPrev,onNext}){
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
     className={'calCell'+(c.inMonth?'':' outMonth')+(key===todayKey?' today':'')+(key===selectedDay?' selected':'')+(amt&&!(key===selectedDay)?' hasSpend':'')}
     onClick={()=>c.inMonth&&onSelectDay(key)}>
     <span className="calDay">{c.day}</span>
     {amt?<span className="calAmt">{formatINR(amt).replace('₹','')}</span>:null}
    </div>
   })}
  </div>
 </div>
}

createRoot(document.getElementById('root')).render(<App/>);
