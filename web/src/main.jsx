import React,{useEffect,useMemo,useState,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {PieChart,Pie,Cell,Tooltip,ResponsiveContainer,LineChart,Line,XAxis,YAxis,CartesianGrid,BarChart,Bar} from 'recharts';
import * as XLSX from 'xlsx';
import {defaultCategories,paymentMethods,avatarChoices,defaultProfile,emptyExpenses,formatINR,total,monthNames,weekdayLabels,dateKey,buildCalendarGrid,toExpenseRows,isIncomeCategory,buildBackupPayload,parseBackupPayload,isEncryptedBackupText,defaultAppLock,isValidPin,recurringFrequencies,frequencyLabels,generateDueExpenses,computeQuickAddSuggestions,computeStreaks,computePeriodComparison,normalizeImportedRows} from './shared';
import {secureGet,secureSet} from './secureStorage';
import {encryptBackupPayload,decryptBackupPayload} from './backupCrypto';
import {Home,ListChecks,Plus,PieChart as PieChartIcon,Target,Tags,User,X,Download,Upload,ChevronLeft,ChevronRight,Lock,Flame,TrendingUp,TrendingDown} from 'lucide-react';
import './style.css';

const PALETTE=['#8BC63E','#F5A623','#4C8EF7','#B98BF0','#F26D6D','#39B8A6'];
const today=()=>new Date().toISOString().slice(0,10);

function App(){
 const [expenses,setExpenses]=useState(emptyExpenses);
 const [categories,setCategories]=useState(defaultCategories);
 const [budget,setBudget]=useState(0);
 const [categoryBudgets,setCategoryBudgets]=useState({});
 const [recurring,setRecurring]=useState([]);
 const [appLock,setAppLock]=useState(defaultAppLock);
 const [profile,setProfile]=useState(defaultProfile);
 const [theme,setTheme]=useState('light');
 const [loaded,setLoaded]=useState(false);
 const [tab,setTab]=useState('dashboard'),[editing,setEditing]=useState(null),[search,setSearch]=useState(''),[filter,setFilter]=useState('all');
 const [addPresetDate,setAddPresetDate]=useState(null);
 const [dateFrom,setDateFrom]=useState(''),[dateTo,setDateTo]=useState(''),[amountMin,setAmountMin]=useState(''),[amountMax,setAmountMax]=useState('');
 const [onboardingDone,setOnboardingDone]=useState(true);
 const now=new Date();
 const [calYear,setCalYear]=useState(now.getFullYear());
 const [calMonth,setCalMonth]=useState(now.getMonth());

 // --- app lock (session-only; resets on every page load, and re-locks when the tab is hidden) ---
 const [unlocked,setUnlocked]=useState(false);
 useEffect(()=>{
  function onVisibility(){if(document.hidden&&appLock.enabled)setUnlocked(false)}
  document.addEventListener('visibilitychange',onVisibility);
  return()=>document.removeEventListener('visibilitychange',onVisibility);
 },[appLock.enabled]);

 // --- undo snackbar (used for both delete-undo and quick-add-undo) ---
 const [undoState,setUndoState]=useState(null); // {message,onUndo}
 const undoTimer=useRef(null);
 function flashUndo(message,onUndo){
  clearTimeout(undoTimer.current);
  setUndoState({message,onUndo});
  undoTimer.current=setTimeout(()=>setUndoState(null),6000);
 }
 function undoLast(){
  if(!undoState)return;
  undoState.onUndo();
  clearTimeout(undoTimer.current);setUndoState(null);
 }

 // Load once on mount (decrypting from IndexedDB-backed key + localStorage ciphertext).
 useEffect(()=>{(async()=>{
  const [e,c,b,p,cb,r,al,th,ob]=await Promise.all([
   secureGet('det-expenses',emptyExpenses),
   secureGet('det-categories',defaultCategories),
   secureGet('det-budget',0),
   secureGet('det-profile',defaultProfile),
   secureGet('det-categoryBudgets',{}),
   secureGet('det-recurring',[]),
   secureGet('det-appLock',defaultAppLock),
   secureGet('det-theme','light'),
   secureGet('det-onboardingDone',false)
  ]);
  // Catch up any recurring expenses that came due while the app was closed.
  const {newExpenses,updatedTemplates}=generateDueExpenses(r,e,today());
  const mergedExpenses=newExpenses.length?[...newExpenses,...e]:e;
  setExpenses(mergedExpenses);setCategories(c);setBudget(Number(b)||0);setProfile({...defaultProfile,...p});setCategoryBudgets(cb);setRecurring(updatedTemplates);setAppLock({...defaultAppLock,...al});setTheme(th==='dark'?'dark':'light');setOnboardingDone(!!ob);setLoaded(true)
 })()},[]);
 // Guarded by `loaded` so we never encrypt-and-overwrite storage with the initial
 // placeholder state before the real data has finished loading.
 useEffect(()=>{if(loaded)secureSet('det-expenses',expenses).catch(console.error)},[expenses,loaded]);
 useEffect(()=>{if(loaded)secureSet('det-categories',categories).catch(console.error)},[categories,loaded]);
 useEffect(()=>{if(loaded)secureSet('det-budget',budget).catch(console.error)},[budget,loaded]);
 useEffect(()=>{if(loaded)secureSet('det-profile',profile).catch(console.error)},[profile,loaded]);
 useEffect(()=>{if(loaded)secureSet('det-categoryBudgets',categoryBudgets).catch(console.error)},[categoryBudgets,loaded]);
 useEffect(()=>{if(loaded)secureSet('det-recurring',recurring).catch(console.error)},[recurring,loaded]);
 useEffect(()=>{if(loaded)secureSet('det-appLock',appLock).catch(console.error)},[appLock,loaded]);
 useEffect(()=>{if(loaded)secureSet('det-onboardingDone',onboardingDone).catch(console.error)},[onboardingDone,loaded]);
 useEffect(()=>{
  document.documentElement.dataset.theme=theme;
  if(loaded)secureSet('det-theme',theme).catch(console.error);
 },[theme,loaded]);

 const month=expenses.filter(e=>e.date.startsWith(today().slice(0,7)));
 const monthExpenseItems=month.filter(e=>!isIncomeCategory(categories,e.category));
 const monthIncomeItems=month.filter(e=>isIncomeCategory(categories,e.category));
 const monthTotal=total(monthExpenseItems);
 const monthIncomeTotal=total(monthIncomeItems);
 const remaining=budget-monthTotal;
 const byCat=useMemo(()=>categories.filter(c=>!c.income).map(c=>({name:c.name,value:total(monthExpenseItems.filter(e=>e.category===c.id))})).filter(x=>x.value),[monthExpenseItems,categories]);
 const categorySpend=useMemo(()=>{const m={};monthExpenseItems.forEach(e=>{m[e.category]=(m[e.category]||0)+Number(e.amount)});return m},[monthExpenseItems]);
 const daily=useMemo(()=>{let m={};monthExpenseItems.forEach(e=>m[e.date]=(m[e.date]||0)+Number(e.amount));return Object.entries(m).sort().map(([date,amount])=>({date:date.slice(5),amount}))},[monthExpenseItems]);
 const top=byCat.slice().sort((a,b)=>b.value-a.value)[0];
 const visible=expenses.filter(e=>
   (e.description+' '+e.note).toLowerCase().includes(search.toLowerCase())
   &&(filter==='all'||e.category===filter)
   &&(!dateFrom||e.date>=dateFrom)
   &&(!dateTo||e.date<=dateTo)
   &&(!amountMin||Number(e.amount)>=Number(amountMin))
   &&(!amountMax||Number(e.amount)<=Number(amountMax))
  ).sort((a,b)=>b.date.localeCompare(a.date));
 const dateFilterActive=dateFrom||dateTo||amountMin||amountMax;
 const singleDaySelected=dateFrom&&dateFrom===dateTo?dateFrom:null;

 const spendByDay=useMemo(()=>{const m={};expenses.forEach(e=>{m[e.date]=(m[e.date]||0)+Number(e.amount)});return m},[expenses]);
 // Chips of things you've logged more than once, so adding them again is one click.
 const quickAdd=useMemo(()=>computeQuickAddSuggestions(expenses,6),[expenses]);
 const streaks=useMemo(()=>computeStreaks(expenses,today()),[expenses]);
 const comparison=useMemo(()=>computePeriodComparison(expenses,categories,today()),[expenses,categories]);

 function saveExpense(x,repeat){
  if(!editing&&repeat&&repeat!=='none'){
   const template={id:'r-'+Date.now(),amount:x.amount,description:x.description,category:x.category,paymentMethod:x.paymentMethod,note:x.note,frequency:repeat,startDate:x.date,active:true,lastGeneratedDate:null};
   const {newExpenses,updatedTemplates}=generateDueExpenses([template],expenses,today());
   setRecurring(p=>[...p,...updatedTemplates]);
   setExpenses(p=>[...newExpenses,...p]);
  }else{
   setExpenses(p=>editing?p.map(e=>e.id===x.id?x:e):[x,...p]);
  }
  setEditing(null);setTab('expenses')
 }
 function remove(id){
  setExpenses(p=>{
   const index=p.findIndex(e=>e.id===id);
   if(index===-1)return p;
   const item=p[index];
   flashUndo('Expense deleted',()=>setExpenses(prev=>{const n=prev.slice();n.splice(index,0,item);return n}));
   return p.filter(e=>e.id!==id);
  });
 }
 // One click to re-log something you've bought before (Chai, auto fare, etc.) - no form at all.
 function addQuickExpense(sugg){
  const newExpense={id:Date.now().toString(),amount:sugg.amount,description:sugg.description,date:today(),category:sugg.category,paymentMethod:sugg.paymentMethod,note:''};
  setExpenses(p=>[newExpense,...p]);
  flashUndo(`Added ${sugg.description} · ${formatINR(sugg.amount)}`,()=>setExpenses(p=>p.filter(e=>e.id!==newExpense.id)));
 }
 function startAdd(presetDate){setEditing(null);setAddPresetDate(presetDate||null);setTab('add')}
 function startEdit(x){setEditing(x);setAddPresetDate(null);setTab('add')}
 // Tapping a day on the dashboard calendar goes straight to Add expense (preset to that date)
 // instead of routing through the Expenses tab.
 function openDay(d){startAdd(d)}
 function toggleRecurring(id){setRecurring(p=>p.map(t=>t.id===id?{...t,active:!t.active}:t))}
 function deleteRecurring(id){
  if(confirm('Delete this recurring expense? Past expenses it already created will stay - this only stops future ones.'))setRecurring(p=>p.filter(t=>t.id!==id));
 }
 function setCategoryBudget(id,value){setCategoryBudgets(p=>({...p,[id]:Number(value)||0}))}

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
 // Full data backup, password-encrypted before it ever leaves the browser - this app is fully
 // offline with no account or server, so this file is the only thing that can carry your data
 // across clearing browser data or switching devices.
 const [backupPassword,setBackupPassword]=useState(''),[restorePassword,setRestorePassword]=useState('');
 async function exportBackup(){
  if(backupPassword.length<4)return alert('Enter a backup password with at least 4 characters. You will need it again to restore this backup.');
  const plain=buildBackupPayload({expenses,categories,budget,profile});
  const envelope=await encryptBackupPayload(plain,backupPassword);
  const blob=new Blob([envelope],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='daily-expense-backup.json';a.click();
 }
 function importBackup(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=async()=>{
   let text=reader.result;
   if(isEncryptedBackupText(text)){
    if(!restorePassword){alert('Enter the backup password first - this backup is encrypted.');e.target.value='';return}
    try{text=await decryptBackupPayload(text,restorePassword)}catch(err){alert("Wrong password - that doesn't match this backup.");e.target.value='';return}
   }
   let data;
   try{data=parseBackupPayload(text)}catch(err){alert("That doesn't look like a valid backup file.");e.target.value='';return}
   if(!confirm('This replaces everything currently in the app with the backup data. This cannot be undone. Continue?')){e.target.value='';return}
   setExpenses(data.expenses);setCategories(data.categories.length?data.categories:defaultCategories);setBudget(data.budget);setProfile(data.profile);setRestorePassword('');
   alert('Restored from backup.');
  };
  reader.readAsText(file);
  e.target.value='';
 }
 // CSV/Excel import for migrating from a spreadsheet - reuses the same xlsx library already
 // used for export, which can read both .xlsx and .csv from the same file input.
 function importSpreadsheet(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
   let imported,skipped;
   try{
    const wb=XLSX.read(reader.result,{type:'array'});
    const ws=wb.Sheets[wb.SheetNames[0]];
    const rows=XLSX.utils.sheet_to_json(ws,{raw:false,defval:''});
    ({imported,skipped}=normalizeImportedRows(rows,categories));
   }catch(err){
    alert('Could not read that file - make sure it\u2019s a .csv or .xlsx with a header row including at least Date and Amount.');
    e.target.value='';return;
   }
   if(!imported.length){
    alert(skipped?`All ${skipped} row(s) were skipped - check the Date and Amount columns.`:'No rows were found in that file.');
    e.target.value='';return;
   }
   const proceed=confirm(`Import ${imported.length} expense${imported.length===1?'':'s'}?`+(skipped?` ${skipped} row(s) will be skipped due to a missing/invalid amount or date.`:'')+' This adds to your existing expenses - nothing will be overwritten.');
   if(proceed){
    setExpenses(p=>[...imported,...p]);
    alert(`Imported ${imported.length} expense${imported.length===1?'':'s'}.`);
   }
   e.target.value='';
  };
  reader.readAsArrayBuffer(file);
 }

 if(!loaded)return <div className="app"><main style={{padding:40}}>Loading your data…</main></div>;

 if(appLock.enabled&&!unlocked)return <LockScreen appLock={appLock} onUnlock={()=>setUnlocked(true)}/>;

 if(!onboardingDone)return <Onboarding onDone={()=>setOnboardingDone(true)}/>;

 return <div className="app">
  <aside>
   <div className="brand"><span className="mark">💰</span><span>DailyExpense</span></div>
   <div className="nav">{[['dashboard',Home,'Dashboard'],['expenses',ListChecks,'Expenses'],['analytics',PieChartIcon,'Analytics'],['budget',Target,'Budget'],['categories',Tags,'Categories'],['profile',User,'Profile']].map(([key,Icon,label])=>
    <button key={key} className={tab===key?'active':''} onClick={()=>setTab(key)}><Icon size={17} strokeWidth={2.2}/>{label}</button>)}
   </div>
   <div className="sideCard"><h4>Upgrade to Pro</h4><p>Full history sync & insights.</p><button className="accent" style={{width:'100%'}}>Upgrade now</button></div>
  </aside>
  <main>
   <header>
    <div className="headerTitle">
     <div className="avatarPreview small">{profile.avatarImage?<img src={profile.avatarImage} alt="Profile"/>:<span>{profile.avatar||'🙂'}</span>}</div>
     <div><div className="eyebrow">PERSONAL FINANCE</div><h1>{tab==='dashboard'?(profile.nickName?`Hi ${profile.nickName} 👋`:'Hi there! 👋'):tab[0].toUpperCase()+tab.slice(1)}</h1><p>Track everyday spending without the clutter.</p></div>
    </div>
    <div className="headerActions"><button className="primary btnRow" aria-label="Open add expense form" onClick={()=>startAdd()}><Plus size={16}/> Add expense</button></div>
   </header>

   {tab==='dashboard'&&<>
    <section className="cards">
     <Metric title="Expenses" value={formatINR(monthTotal)} highlight/>
     <Metric title="Remaining balance" value={budget>0?formatINR(remaining):'—'} highlight warn={budget>0&&remaining<0}/>
     <Metric title="Income this month" value={formatINR(monthIncomeTotal)}/>
     <Metric title="Top category" value={top?.name||'—'}/>
    </section>
    {budget<=0&&<p className="hint" style={{marginTop:-10,marginBottom:14}}><button className="mini" onClick={()=>setTab('budget')}>Set a monthly budget</button> to see your remaining balance.</p>}
    {streaks.current>=2&&<div className="streakBadge"><Flame size={16}/> {streaks.current}-day logging streak{streaks.longest>streaks.current?` · best ${streaks.longest}`:''}</div>}
    {quickAdd.length>0&&<Panel title="Quick add">
     <div className="quickAddRow">
      {quickAdd.map((q,i)=>{
       const c=categories.find(c=>c.id===q.category);
       return <button key={i} className="quickChip" onClick={()=>addQuickExpense(q)} aria-label={`Add ${q.description}, ${formatINR(q.amount)}`}>
        <span className="quickChipName">{c?.icon||'📦'} {q.description}</span>
        <span className="quickChipAmount">{formatINR(q.amount)}</span>
       </button>
      })}
     </div>
     <p className="hint">Things you've logged more than once - click to add again with today's date.</p>
    </Panel>}
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
       <EmptyState icon="🧾" text="No expenses yet. Add your first one to see it here." actionLabel={<><Plus size={14}/> Add expense</>} onAction={()=>startAdd()}/>}
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
     <label className="inlineDate">Min ₹<input type="number" value={amountMin} onChange={e=>setAmountMin(e.target.value)} placeholder="0" style={{width:80}}/></label>
     <label className="inlineDate">Max ₹<input type="number" value={amountMax} onChange={e=>setAmountMax(e.target.value)} placeholder="No limit" style={{width:80}}/></label>
     {dateFilterActive&&<button className="mini" onClick={()=>{setDateFrom('');setDateTo('');setAmountMin('');setAmountMax('')}}>Clear filters</button>}
     {expenses.length>0&&<>
      <button onClick={exportCSV}>Export CSV</button>
      <button onClick={exportExcel}>Export Excel</button>
     </>}
    </div>
    {singleDaySelected&&<div className="panelHead" style={{marginTop:-6}}>
     <span className="hint" style={{margin:0}}>Showing {singleDaySelected} · {formatINR(total(visible))} total</span>
     <button className="primary mini btnRow" onClick={()=>startAdd(singleDaySelected)}><Plus size={14}/> Add expense for this date</button>
    </div>}
    {visible.length?
     <ExpenseList items={visible} cats={categories} onEdit={startEdit} onDelete={remove}/>:
     (expenses.length?<EmptyState icon="🔍" text="No expenses match these filters."/>:
      <EmptyState icon="🧾" text="You haven't added any expenses yet." actionLabel={<><Plus size={14}/> Add expense</>} onAction={()=>startAdd()}/>)}
   </Panel>}

   {tab==='add'&&<ExpenseForm key={editing?editing.id:('new-'+(addPresetDate||''))} initial={editing} presetDate={addPresetDate} cats={categories} allExpenses={expenses} onEditExpense={startEdit} onDeleteExpense={remove} onCancel={()=>setTab('expenses')} onSave={saveExpense}/>}

   {tab==='analytics'&&<>
    <Panel title="This month vs last month">
     <div className="budgetMeta"><b>This month</b><span>{formatINR(comparison.curTotal)}</span></div>
     <div className="budgetMeta"><span className="hint" style={{margin:0}}>Last month</span><span className="hint" style={{margin:0}}>{formatINR(comparison.prevTotal)}</span></div>
     {comparison.momPct===null?
      <p className="hint">Not enough history yet to compare to last month.</p>:
      <p className={'hint compareLine'+(comparison.momPct>0?' up':comparison.momPct<0?' down':'')}>
       {comparison.momPct>0?<TrendingUp size={14}/>:comparison.momPct<0?<TrendingDown size={14}/>:null} {Math.abs(comparison.momPct).toFixed(0)}% vs last month
      </p>}
     {comparison.yoyPct!==null&&
      <p className={'hint compareLine'+(comparison.yoyPct>0?' up':comparison.yoyPct<0?' down':'')}>
       {comparison.yoyPct>0?<TrendingUp size={14}/>:comparison.yoyPct<0?<TrendingDown size={14}/>:null} {Math.abs(comparison.yoyPct).toFixed(0)}% vs {monthNames[Number(comparison.lastYearMonth.slice(5,7))-1]} last year
      </p>}
    </Panel>
    <div className="grid">
     <Panel title="Category spending">{byCat.length?<Donut data={byCat}/>:<EmptyState icon="📊" text="No spending yet this month. Add an expense to see the breakdown."/>}</Panel>
     <Panel title="Daily spending">{daily.length?<Trend data={daily}/>:<EmptyState icon="📅" text="No spending yet this month."/>}</Panel>
    </div>
    <Panel title="Monthly overview (income vs expense)"><MonthlyBars expenses={expenses} categories={categories}/></Panel>
   </>}

   {tab==='budget'&&<>
    <Budget budget={budget} setBudget={setBudget} spent={monthTotal}/>
    <Panel title="Category budgets">
     <p className="hint" style={{margin:'0 0 14px'}}>Set a monthly limit for individual categories, in addition to your overall budget above.</p>
     {categories.filter(c=>!c.income).map(c=>{
      const catBudget=categoryBudgets[c.id]||0;
      const catSpent=categorySpend[c.id]||0;
      const catPct=catBudget>0?Math.min(100,catSpent/catBudget*100):0;
      return <div key={c.id} style={{marginBottom:16}}>
       <div className="budgetMeta"><b>{c.icon} {c.name}</b><input className="budgetInput small" type="number" placeholder="No limit" value={catBudget||''} onChange={e=>setCategoryBudget(c.id,e.target.value)}/></div>
       {catBudget>0&&<>
        <div className={'progress'+(catPct>=80?' warn':'')}><i style={{width:catPct+'%'}}/></div>
        <p className="hint">{formatINR(catSpent)} of {formatINR(catBudget)} spent this month</p>
       </>}
      </div>
     })}
    </Panel>
    <Panel title="Recurring expenses">
     {recurring.length?<div>{recurring.map(t=>{
      const c=categories.find(c=>c.id===t.category);
      return <div className="expense" key={t.id}>
       <span className="icon">{c?.icon||'📦'}</span>
       <div className="grow"><b>{t.description}</b><small>{frequencyLabels[t.frequency]} · {formatINR(t.amount)}{!t.active?' · Paused':''}</small></div>
       <button className="mini" onClick={()=>toggleRecurring(t.id)}>{t.active?'Pause':'Resume'}</button>
       <button className="mini danger" onClick={()=>deleteRecurring(t.id)}>Delete</button>
      </div>
     })}</div>:<EmptyState icon="🔁" text="No recurring expenses yet. Add one from the Add expense screen using the Repeat option." actionLabel={<><Plus size={14}/> Add expense</>} onAction={()=>startAdd()}/>}
    </Panel>
   </>}
   {tab==='categories'&&<CategoryManager cats={categories} setCats={setCategories} expenses={expenses}/>}
   {tab==='profile'&&<>
    <Profile profile={profile} setProfile={setProfile}/>
    <Panel title="Appearance">
     <div className="themeToggle">
      <button className={theme==='light'?'active':''} onClick={()=>setTheme('light')}>☀ Light</button>
      <button className={theme==='dark'?'active':''} onClick={()=>setTheme('dark')}>🌙 Dark</button>
     </div>
    </Panel>
    <AppLockPanel appLock={appLock} setAppLock={setAppLock} onUnlockNow={()=>setUnlocked(true)}/>
    <Panel title="Import from spreadsheet">
     <p className="hint" style={{margin:'0 0 14px'}}>Migrating from a spreadsheet? Upload a .csv or .xlsx file with Date, Amount, Category, Description, Payment Method, and Note columns (column order doesn't matter, and Category is matched by name).</p>
     <label className="mini fileBtn btnRow"><Upload size={14}/> Choose file to import<input type="file" accept=".csv,.xlsx,.xls" style={{display:'none'}} onChange={importSpreadsheet}/></label>
    </Panel>
    <Panel title="Backup & restore">
     <p className="hint" style={{margin:'0 0 14px'}}>This app keeps everything private in your browser only - there's no account or cloud sync. That means clearing browser data (or reinstalling on mobile) can erase your data. Export a backup first, then restore it here whenever you need to bring your data back.</p>
     <label className="wide">Backup password<input type="password" value={backupPassword} onChange={e=>setBackupPassword(e.target.value)} placeholder="At least 4 characters"/></label>
     <p className="hint">Your backup file is encrypted with this password. Daily Expense Tracker never stores it anywhere, so if you forget it, the backup can't be recovered - keep it somewhere safe.</p>
     <div className="toolbar">
      <button className="primary btnRow" onClick={exportBackup}><Download size={16}/> Export backup</button>
     </div>
     <label className="wide" style={{marginTop:16}}>Backup password (to restore)<input type="password" value={restorePassword} onChange={e=>setRestorePassword(e.target.value)} placeholder="Needed only if the backup is encrypted"/></label>
     <div className="toolbar">
      <label className="mini fileBtn btnRow"><Upload size={14}/> Restore from file<input type="file" accept="application/json" style={{display:'none'}} onChange={importBackup}/></label>
     </div>
    </Panel>
   </>}
  </main>
  {undoState&&<div className="snackbar">
   <span>{undoState.message}</span>
   <button className="mini" onClick={undoLast}>Undo</button>
  </div>}
 </div>
}

function LockScreen({appLock,onUnlock}){
 const [pin,setPin]=useState(''),[error,setError]=useState('');
 function tryPin(e){
  e.preventDefault();
  if(pin===appLock.pin)onUnlock();
  else{setError('Incorrect PIN');setPin('')}
 }
 return <div className="app" style={{display:'block'}}>
  <div className="lockWrap">
   <div className="lockIcon"><Lock size={40} strokeWidth={1.6}/></div>
   <h1>Locked</h1>
   <p className="hint">Enter your PIN to continue</p>
   <form onSubmit={tryPin}>
    <input className="pinInput" type="password" inputMode="numeric" maxLength={6} autoFocus value={pin} onChange={e=>{setPin(e.target.value);setError('')}} placeholder="••••"/>
    {!!error&&<p className="hint" style={{color:'#b23b3b'}}>{error}</p>}
    <button className="primary" style={{marginTop:14}}>Unlock</button>
   </form>
  </div>
 </div>
}

function Onboarding({onDone}){
 return <div className="app" style={{display:'block'}}>
  <div className="onboardWrap">
   <div className="onboardEmoji">💰</div>
   <h1 style={{textAlign:'center'}}>Welcome to Daily Expense Tracker</h1>
   <p className="hint" style={{textAlign:'center',marginBottom:26}}>A few things before you start:</p>
   <div className="onboardRow">
    <span className="onboardIcon">✍️</span>
    <div><b>Log expenses in seconds</b><p className="hint">Click a date on the calendar, or the Add expense button, to add one. No account or setup needed.</p></div>
   </div>
   <div className="onboardRow">
    <span className="onboardIcon">🎯</span>
    <div><b>Set a budget anytime</b><p className="hint">See exactly what's left to spend this month, overall or per category.</p></div>
   </div>
   <div className="onboardRow">
    <span className="onboardIcon">🔒</span>
    <div><b>Everything stays private</b><p className="hint">Your data is encrypted in this browser and never leaves it unless you export a backup yourself.</p></div>
   </div>
   <button className="primary" style={{marginTop:16}} onClick={onDone}>Get started</button>
  </div>
 </div>
}

function AppLockPanel({appLock,setAppLock,onUnlockNow}){
 const [showSetup,setShowSetup]=useState(false),[pinDraft,setPinDraft]=useState(''),[pinConfirm,setPinConfirm]=useState('');
 function persistLock(nextLock){
  setAppLock(nextLock);
  secureSet('det-appLock',nextLock).catch(console.error);
 }
 function savePin(){
  if(!isValidPin(pinDraft))return alert('Use a 4-6 digit PIN');
  if(pinDraft!==pinConfirm)return alert("PINs don't match");
  persistLock({enabled:true,mode:'pin',pin:pinDraft});
  setPinDraft('');setPinConfirm('');setShowSetup(false);
 }
 function turnOff(){
  if(!confirm('Turn off app lock? Anyone who opens this browser tab will be able to see your data.'))return;
  persistLock(defaultAppLock);
  onUnlockNow();
 }
 return <Panel title="App lock">
  {appLock.enabled?<>
   <p className="hint">App lock is on. You'll need your PIN to open the app on this browser.</p>
   {showSetup?<PinSetupForm pinDraft={pinDraft} setPinDraft={setPinDraft} pinConfirm={pinConfirm} setPinConfirm={setPinConfirm} onSave={savePin} onCancel={()=>setShowSetup(false)}/>:<div className="toolbar">
    <button onClick={()=>setShowSetup(true)}>Change PIN</button>
    <button className="danger" onClick={turnOff}>Turn off app lock</button>
   </div>}
  </>:<>
   <p className="hint">Require a PIN to open the app - a good idea for a finance app, especially on a shared computer.</p>
   {showSetup?<PinSetupForm pinDraft={pinDraft} setPinDraft={setPinDraft} pinConfirm={pinConfirm} setPinConfirm={setPinConfirm} onSave={savePin} onCancel={()=>setShowSetup(false)}/>:
    <button className="primary mini" onClick={()=>setShowSetup(true)}>Set up app lock</button>}
  </>}
 </Panel>
}

function PinSetupForm({pinDraft,setPinDraft,pinConfirm,setPinConfirm,onSave,onCancel}){
 return <div className="form" style={{marginTop:10}}>
  <label>New PIN (4-6 digits)<input type="password" inputMode="numeric" maxLength={6} value={pinDraft} onChange={e=>setPinDraft(e.target.value)} placeholder="••••"/></label>
  <label>Confirm PIN<input type="password" inputMode="numeric" maxLength={6} value={pinConfirm} onChange={e=>setPinConfirm(e.target.value)} placeholder="••••"/></label>
  <div className="actions"><button type="button" onClick={onCancel}>Cancel</button><button type="button" className="primary" onClick={onSave}>Save PIN</button></div>
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
    <div className="grow"><b>{e.description||c?.name||'Uncategorized'}</b><small>{c?.name||'Uncategorized'} · {e.date} · {e.paymentMethod}{e.recurringId?' · 🔁':''}</small></div>
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
 const [repeat,setRepeat]=useState('none');
 const set=(k,v)=>setF({...f,[k]:v});
 // Shown below the form so tapping a calendar date still gives visibility into what's
 // already logged that day, without a detour through the Expenses tab.
 const sameDay=(allExpenses||[]).filter(e=>e.date===f.date&&e.id!==f.id).sort((a,b)=>b.date.localeCompare(a.date));
 return <>
  <Panel title={initial?'Edit expense':'Add expense'}>
   <form className="form" onSubmit={e=>{e.preventDefault();if(Number(f.amount)>0)onSave({...f,amount:Number(f.amount),id:f.id||Date.now().toString()},repeat)}}>
    <label>Amount (₹)<input autoFocus type="number" min="1" value={f.amount} onChange={e=>set('amount',e.target.value)} required/></label>
    <label>Date<input type="date" value={f.date} onChange={e=>set('date',e.target.value)} required/></label>
    <label>Category<select value={f.category} onChange={e=>set('category',e.target.value)}>{cats.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></label>
    <label>Payment method<select value={f.paymentMethod} onChange={e=>set('paymentMethod',e.target.value)}>{paymentMethods.map(x=><option key={x}>{x}</option>)}</select></label>
    {!initial&&<label>Repeat<select value={repeat} onChange={e=>setRepeat(e.target.value)}>
     <option value="none">One-time</option>
     {recurringFrequencies.map(f=><option key={f} value={f}>{frequencyLabels[f]}</option>)}
    </select></label>}
    <label className="wide">Description<input value={f.description} onChange={e=>set('description',e.target.value)} placeholder="e.g. Lunch with family"/></label>
    <label className="wide">Notes<textarea value={f.note} onChange={e=>set('note',e.target.value)} placeholder="Optional note"/></label>
    {!initial&&repeat!=='none'&&<p className="hint wide">This will create a recurring {frequencyLabels[repeat].toLowerCase()} expense starting {f.date}, and catch up on any occurrences automatically whenever you open the app.</p>}
    <div className="actions"><button type="button" onClick={onCancel}>Cancel</button><button className="primary">{initial?'Save changes':repeat!=='none'?'Add recurring expense':'Add expense'}</button></div>
   </form>
  </Panel>
  {sameDay.length>0&&<Panel title={`Other expenses on ${f.date}`}>
   <ExpenseList items={sameDay} cats={cats} onEdit={onEditExpense} onDelete={onDeleteExpense}/>
  </Panel>}
 </>
}

function CategoryManager({cats,setCats,expenses}){
 const [name,setName]=useState('');
 const [icon,setIcon]=useState(CATEGORY_ICON_CHOICES[0]);
 function add(){if(!name.trim())return;setCats([...cats,{id:'custom-'+Date.now(),name:name.trim(),icon}]);setName('');setIcon(CATEGORY_ICON_CHOICES[0])}
 function removeCat(id){
  const count=expenses.filter(e=>e.category===id).length;
  const msg=count>0
   ?`This category is used by ${count} expense${count===1?'':'s'}. Deleting it won't delete those expenses, but they'll show as "Uncategorized". Continue?`
   :'Delete this category?';
  if(confirm(msg))setCats(cats.filter(c=>c.id!==id));
 }
 return <Panel title="Categories">
  <div className="toolbar">
   <input value={name} onChange={e=>setName(e.target.value)} placeholder="New category name"/>
   <div className="iconPicker">{CATEGORY_ICON_CHOICES.map(em=><button type="button" key={em} className={'avatarChip small'+(icon===em?' selected':'')} onClick={()=>setIcon(em)}>{em}</button>)}</div>
   <button className="primary btnRow" onClick={add}><Plus size={16}/> Add category</button>
  </div>
  <div className="catGrid">{cats.map(c=><div className="cat" key={c.id}><span>{c.icon}</span><b>{c.name}</b>{c.id.startsWith('custom-')&&<button className="mini danger iconBtn" style={{marginLeft:'auto'}} onClick={()=>removeCat(c.id)}><X size={14}/></button>}</div>)}</div>
 </Panel>
}
const CATEGORY_ICON_CHOICES=['🏷️','🍽️','🚕','🏋️','🎮','📚','🧾','🐾','🎁','✈️','🧹','🔧'];

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
const Trend=({data})=><div className="chart"><ResponsiveContainer><LineChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/><XAxis dataKey="date"/><YAxis/><Tooltip formatter={v=>formatINR(v)}/><Line type="monotone" dataKey="amount" stroke="#8BC63E" strokeWidth={3} dot={false}/></LineChart></ResponsiveContainer></div>;
function MonthlyBars({expenses,categories}){
 let m={};expenses.forEach(e=>{
  let k=e.date.slice(0,7);
  if(!m[k])m[k]={month:k,expense:0,income:0};
  if(isIncomeCategory(categories,e.category))m[k].income+=Number(e.amount);
  else m[k].expense+=Number(e.amount);
 });
 let d=Object.values(m).sort((a,b)=>a.month.localeCompare(b.month)).slice(-6);
 if(!d.length)return <EmptyState icon="📈" text="No data yet. Start adding expenses or income to see monthly trends."/>;
 return <div className="chart"><ResponsiveContainer><BarChart data={d}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/><XAxis dataKey="month"/><YAxis/><Tooltip formatter={v=>formatINR(v)}/><Bar dataKey="expense" name="Expense" fill="#8BC63E" radius={[6,6,0,0]}/><Bar dataKey="income" name="Income" fill="#F5A623" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div>
}

function CalendarView({year,month,spendByDay,onSelectDay,onPrev,onNext}){
 const cells=useMemo(()=>buildCalendarGrid(year,month),[year,month]);
 const todayKey=today();
 return <div className="calendar">
  <div className="panelHead">
   <h2 style={{fontSize:14}}>{monthNames[month]} {year}</h2>
   <div className="navBtns"><button onClick={onPrev}><ChevronLeft size={16}/></button><button onClick={onNext}><ChevronRight size={16}/></button></div>
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
