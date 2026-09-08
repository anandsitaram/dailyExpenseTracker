import React,{useEffect,useMemo,useState} from 'react';
import {SafeAreaView,View,Text,TextInput,TouchableOpacity,ScrollView,StyleSheet,Alert} from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import * as XLSX from 'xlsx';
import {secureGetItem,secureSetItem} from './secureStorage';
import {defaultCategories,paymentMethods,avatarChoices,defaultProfile,emptyExpenses,formatINR,total,monthNames,weekdayLabels,dateKey,buildCalendarGrid,toExpenseRows,isIncomeCategory,buildBackupPayload,parseBackupPayload} from './shared';

const today=()=>new Date().toISOString().slice(0,10);

export default function App(){
 const [expenses,setExpenses]=useState([]),[cats,setCats]=useState(defaultCategories),[budget,setBudget]=useState(0),[loaded,setLoaded]=useState(false);
 const [profile,setProfile]=useState(defaultProfile);
 const [tab,setTab]=useState('home');
 const [editingId,setEditingId]=useState(null);
 const [amount,setAmount]=useState(''),[desc,setDesc]=useState(''),[category,setCategory]=useState('food'),[method,setMethod]=useState('UPI'),[date,setDate]=useState(today()),[note,setNote]=useState('');
 const [newCat,setNewCat]=useState('');
 const [search,setSearch]=useState('');
 const [dateFrom,setDateFrom]=useState(''),[dateTo,setDateTo]=useState(''),[showDateFilter,setShowDateFilter]=useState(false);
 const [restoreText,setRestoreText]=useState('');
 const now=new Date();
 const [calYear,setCalYear]=useState(now.getFullYear()),[calMonth,setCalMonth]=useState(now.getMonth());

 useEffect(()=>{(async()=>{
  let e=await secureGetItem('expenses',emptyExpenses);
  let c=await secureGetItem('categories',defaultCategories);
  let b=Number(await secureGetItem('budget',0));
  let p=await secureGetItem('profile',defaultProfile);
  setExpenses(e);setCats(c);setBudget(b);setProfile({...defaultProfile,...p});setLoaded(true)
 })()},[]);
 // guarded by `loaded` so we never overwrite storage with the initial empty state before load finishes
 useEffect(()=>{if(loaded)secureSetItem('expenses',expenses).catch(console.error)},[expenses,loaded]);
 useEffect(()=>{if(loaded)secureSetItem('categories',cats).catch(console.error)},[cats,loaded]);
 useEffect(()=>{if(loaded)secureSetItem('budget',budget).catch(console.error)},[budget,loaded]);
 useEffect(()=>{if(loaded)secureSetItem('profile',profile).catch(console.error)},[profile,loaded]);

 const month=expenses.filter(e=>e.date.startsWith(today().slice(0,7)));
 const monthExpenseItems=month.filter(e=>!isIncomeCategory(cats,e.category));
 const monthIncomeItems=month.filter(e=>isIncomeCategory(cats,e.category));
 const spent=total(monthExpenseItems),income=total(monthIncomeItems);
 const remaining=budget-spent;
 const pct=budget>0?Math.min(100,spent/budget*100):0;
 const byCat=useMemo(()=>cats.filter(c=>!c.income).map(c=>({...c,value:total(monthExpenseItems.filter(e=>e.category===c.id))})).filter(c=>c.value).sort((a,b)=>b.value-a.value),[monthExpenseItems,cats]);
 const spendByDay=useMemo(()=>{const m={};expenses.forEach(e=>{m[e.date]=(m[e.date]||0)+Number(e.amount)});return m},[expenses]);
 const visibleExpenses=useMemo(()=>expenses.filter(e=>
   (e.description+' '+(e.note||'')).toLowerCase().includes(search.toLowerCase())
   &&(!dateFrom||e.date>=dateFrom)
   &&(!dateTo||e.date<=dateTo)
  ).sort((a,b)=>b.date.localeCompare(a.date)),[expenses,search,dateFrom,dateTo]);
 const dateFilterActive=dateFrom||dateTo;
 const singleDaySelected=dateFrom&&dateFrom===dateTo?dateFrom:null;
 // Shown under the Add-expense form so tapping a calendar date still gives visibility
 // into what's already logged that day, without a detour through the Expenses tab.
 const sameDayExpenses=useMemo(()=>expenses.filter(e=>e.date===date&&e.id!==editingId).sort((a,b)=>b.date.localeCompare(a.date)),[expenses,date,editingId]);

 function resetForm(presetDate){setEditingId(null);setAmount('');setDesc('');setCategory(cats.find(c=>!c.income)?.id||cats[0]?.id||'food');setMethod('UPI');setDate(presetDate||today());setNote('')}
 function startEdit(e){setEditingId(e.id);setAmount(String(e.amount));setDesc(e.description||'');setCategory(e.category);setMethod(e.paymentMethod);setDate(e.date);setNote(e.note||'');setTab('add')}
 function startAdd(presetDate){resetForm(presetDate);setTab('add')}
 // Tapping a day on the dashboard calendar goes straight to Add expense (preset to that date)
 // instead of routing through the Expenses tab.
 function openDay(d){startAdd(d)}
 function save(){
  if(!Number(amount))return Alert.alert('Enter amount');
  if(editingId){
   setExpenses(expenses.map(e=>e.id===editingId?{...e,amount:Number(amount),description:desc||cats.find(c=>c.id===category)?.name,date,category,paymentMethod:method,note}:e))
  }else{
   setExpenses([{id:Date.now().toString(),amount:Number(amount),description:desc||cats.find(c=>c.id===category)?.name,date,category,paymentMethod:method,note},...expenses])
  }
  resetForm();setTab('expenses')
 }
 function removeExpense(id){
  Alert.alert('Delete expense','This cannot be undone.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>setExpenses(expenses.filter(e=>e.id!==id))}])
 }
 function addCategory(){
  if(!newCat.trim())return;
  setCats([...cats,{id:'custom-'+Date.now(),name:newCat.trim(),icon:'🏷️'}]);setNewCat('')
 }
 function removeCategory(id){setCats(cats.filter(c=>c.id!==id))}
 async function exportExcel(){
  const rows=toExpenseRows(expenses,cats);
  const ws=XLSX.utils.json_to_sheet(rows);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Expenses');
  const wbout=XLSX.write(wb,{type:'base64',bookType:'xlsx'});
  const path=RNFS.DocumentDirectoryPath+'/daily-expenses.xlsx';
  await RNFS.writeFile(path,wbout,'base64');
  try{
   await Share.open({
    url:'file://'+path,
    type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    title:'Export expenses',
    failOnCancel:false
   });
  }catch(e){
   Alert.alert('Saved to',path);
  }
 }
 // Full data backup - this app is fully offline with no account or server, so this file is the
 // only thing that can carry your data across an uninstall/reinstall or a new phone.
 async function exportBackup(){
  const payload=buildBackupPayload({expenses,categories:cats,budget,profile});
  const path=RNFS.DocumentDirectoryPath+'/daily-expense-backup.json';
  await RNFS.writeFile(path,payload,'utf8');
  try{
   await Share.open({url:'file://'+path,type:'application/json',title:'Save your backup',failOnCancel:false});
  }catch(e){
   Alert.alert('Backup saved to',path);
  }
 }
 function restoreBackup(){
  if(!restoreText.trim())return Alert.alert('Paste your backup first','Open your saved backup file, copy all of its text, then paste it here.');
  let data;
  try{data=parseBackupPayload(restoreText)}catch(e){return Alert.alert("That doesn't look like a valid backup","Please check you copied the whole file and try again.")}
  Alert.alert('Restore this backup?','This replaces everything currently in the app with the backup data. This cannot be undone.',[
   {text:'Cancel',style:'cancel'},
   {text:'Restore',style:'destructive',onPress:()=>{
    setExpenses(data.expenses);setCats(data.categories.length?data.categories:defaultCategories);setBudget(data.budget);setProfile(data.profile);
    setRestoreText('');
    Alert.alert('Restored','Your data has been restored from the backup.')
   }}
  ])
 }

 const Nav=()=><View style={s.nav}>{[['home','⌂','Home'],['expenses','☷','Expenses'],['add','＋','Add'],['analytics','◔','Analytics'],['budget','◎','Budget'],['categories','◇','Categories'],['profile','☺','Profile']].map(x=>
  <TouchableOpacity key={x[0]} onPress={()=>x[0]==='add'?startAdd():setTab(x[0])} style={s.navItem}>
   <Text style={[s.navIcon,tab===x[0]&&s.navActive]}>{x[1]}</Text>
   <Text style={tab===x[0]?s.navTextActive:s.navText}>{x[2]}</Text>
  </TouchableOpacity>)}
 </View>;

 if(!loaded)return <SafeAreaView style={s.safe}><View style={s.loadingWrap}><Text style={s.muted}>Loading your data…</Text></View></SafeAreaView>;

 return <SafeAreaView style={s.safe}>
  <ScrollView contentContainerStyle={s.container}>
   {tab==='home'&&<>
    <View style={s.greetRow}>
     <View style={s.avatarCircle}><Text style={s.avatarEmoji}>{profile.avatar||'🙂'}</Text></View>
     <View style={{flex:1}}>
      <Text style={s.title}>{profile.nickName?`Hi ${profile.nickName} 👋`:'Hi there! 👋'}</Text>
      <Text style={s.muted}>Personal spending dashboard</Text>
     </View>
    </View>
    <View style={s.hero}>
     <View style={s.heroRow}>
      <View style={s.heroCol}><Text style={s.mutedLight}>Expenses</Text><Text style={s.total}>{formatINR(spent)}</Text></View>
      <View style={s.heroDivider}/>
      <View style={s.heroCol}><Text style={s.mutedLight}>Remaining balance</Text><Text style={[s.total,budget>0&&remaining<0&&s.totalWarn]}>{budget>0?formatINR(remaining):'—'}</Text></View>
     </View>
     <Text style={s.mutedLight}>{month.length} transaction{month.length===1?'':'s'} this month</Text>
     {budget<=0&&<TouchableOpacity onPress={()=>setTab('budget')}><Text style={s.heroHint}>Set a monthly budget to see your remaining balance →</Text></TouchableOpacity>}
    </View>
    <View style={s.two}><Stat t="Income this month" v={formatINR(income)}/><Stat t="Top category" v={byCat[0]?.name||'—'}/></View>
    <Section title="Calendar">
     <Calendar year={calYear} month={calMonth} spendByDay={spendByDay}
      onSelectDay={openDay}
      onPrev={()=>{if(calMonth===0){setCalMonth(11);setCalYear(calYear-1)}else setCalMonth(calMonth-1)}}
      onNext={()=>{if(calMonth===11){setCalMonth(0);setCalYear(calYear+1)}else setCalMonth(calMonth+1)}}/>
     <Text style={s.hint}>Tap any day to add an expense for that date.</Text>
    </Section>
    <Section title="Recent expenses">
     {expenses.length?expenses.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6).map(e=><Row key={e.id} e={e} cats={cats} onEdit={startEdit} onDelete={removeExpense}/>):
      <EmptyState icon="🧾" text="No expenses yet. Tap the + tab below to add your first one." actionLabel="Add an expense" onAction={()=>startAdd()}/>}
    </Section>
   </>}

   {tab==='expenses'&&<Section title="Expense history">
    <TextInput style={s.input} placeholder="Search description or note" value={search} onChangeText={setSearch}/>
    <TouchableOpacity style={s.dateToggle} onPress={()=>setShowDateFilter(!showDateFilter)}><Text style={s.linkBtn}>{showDateFilter?'Hide date filter':'Filter by date'}</Text></TouchableOpacity>
    {showDateFilter&&<View style={s.rowInline}>
     <View style={{flex:1}}><Text style={s.smallLabel}>From (YYYY-MM-DD)</Text><TextInput style={s.input} value={dateFrom} onChangeText={setDateFrom} placeholder="2026-09-01"/></View>
     <View style={{flex:1}}><Text style={s.smallLabel}>To (YYYY-MM-DD)</Text><TextInput style={s.input} value={dateTo} onChangeText={setDateTo} placeholder="2026-09-30"/></View>
    </View>}
    {dateFilterActive&&<TouchableOpacity onPress={()=>{setDateFrom('');setDateTo('')}}><Text style={s.danger}>Clear date filter</Text></TouchableOpacity>}
    {singleDaySelected&&<TouchableOpacity style={s.secondary} onPress={()=>startAdd(singleDaySelected)}><Text style={s.secondaryText}>＋ Add expense for {singleDaySelected}</Text></TouchableOpacity>}
    {expenses.length>0&&<TouchableOpacity style={s.secondary} onPress={exportExcel}><Text style={s.secondaryText}>Export to Excel</Text></TouchableOpacity>}
    {visibleExpenses.map(e=><Row key={e.id} e={e} cats={cats} onEdit={startEdit} onDelete={removeExpense}/>)}
    {!visibleExpenses.length&&(expenses.length?
     <EmptyState icon="🔍" text="No expenses match these filters."/>:
     <EmptyState icon="🧾" text="You haven't added any expenses yet." actionLabel="Add an expense" onAction={()=>startAdd()}/>)}
   </Section>}

   {tab==='add'&&<>
    <Section title={editingId?'Edit expense':'Add expense'}>
     <Text style={s.label}>Amount</Text>
     <TextInput style={s.input} keyboardType="numeric" placeholder="₹ 0" value={amount} onChangeText={setAmount}/>
     <Text style={s.label}>Description</Text>
     <TextInput style={s.input} placeholder="What did you spend on?" value={desc} onChangeText={setDesc}/>
     <Text style={s.label}>Category</Text>
     <ScrollView horizontal showsHorizontalScrollIndicator={false}>{cats.map(c=><TouchableOpacity key={c.id} onPress={()=>setCategory(c.id)} style={[s.chip,category===c.id&&s.selected]}><Text style={s.chipText}>{c.icon} {c.name}</Text></TouchableOpacity>)}</ScrollView>
     <Text style={s.label}>Payment method</Text>
     <ScrollView horizontal showsHorizontalScrollIndicator={false}>{paymentMethods.map(x=><TouchableOpacity key={x} onPress={()=>setMethod(x)} style={[s.chip,method===x&&s.selected]}><Text style={s.chipText}>{x}</Text></TouchableOpacity>)}</ScrollView>
     <Text style={s.label}>Date (YYYY-MM-DD)</Text>
     <TextInput style={s.input} value={date} onChangeText={setDate}/>
     <Text style={s.label}>Notes</Text>
     <TextInput style={s.input} value={note} onChangeText={setNote} placeholder="Optional note"/>
     <TouchableOpacity style={s.primary} onPress={save}><Text style={s.primaryText}>{editingId?'Save changes':'Add expense'}</Text></TouchableOpacity>
     {editingId&&<TouchableOpacity style={s.cancel} onPress={()=>{resetForm();setTab('expenses')}}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>}
    </Section>
    {sameDayExpenses.length>0&&<Section title={`Other expenses on ${date}`}>
     {sameDayExpenses.map(e=><Row key={e.id} e={e} cats={cats} onEdit={startEdit} onDelete={removeExpense}/>)}
    </Section>}
   </>}

   {tab==='analytics'&&<>
    <Section title="Category spending">
     {byCat.length?byCat.map(c=><View style={s.metric} key={c.id}><View style={s.rowTop}><Text style={s.bold}>{c.icon} {c.name}</Text><Text style={s.bold}>{formatINR(c.value)}</Text></View><View style={s.track}><View style={[s.fill,{width:(spent?c.value/spent*100:0)+'%'}]}/></View></View>):
      <EmptyState icon="📊" text="No spending yet this month. Add an expense to see the breakdown."/>}
    </Section>
    <Section title="Daily spending">
     {Object.keys(monthExpenseItems.reduce((m,e)=>(m[e.date]=1,m),{})).length?
      Object.entries(monthExpenseItems.reduce((m,e)=>(m[e.date]=(m[e.date]||0)+Number(e.amount),m),{})).sort().map(([d,v])=><View style={s.rowTop} key={d}><Text>{d}</Text><Text style={s.bold}>{formatINR(v)}</Text></View>):
      <EmptyState icon="📅" text="No spending yet this month."/>}
    </Section>
    <Section title="Monthly overview (income vs expense)"><MonthlyOverview expenses={expenses} cats={cats}/></Section>
   </>}

   {tab==='budget'&&<Section title="Monthly budget">
    <Text style={s.muted}>Spent</Text><Text style={s.big}>{formatINR(spent)}</Text>
    <Text style={s.muted}>Budget</Text>
    <TextInput style={s.input} keyboardType="numeric" placeholder="Enter your monthly budget" value={budget?String(budget):''} onChangeText={x=>setBudget(Number(x)||0)}/>
    {budget>0?<>
     <View style={s.track}><View style={[s.fill,pct>=80&&s.fillWarn,{width:pct+'%'}]}/></View>
     <View style={s.rowTop}><Text>{pct.toFixed(0)}% used</Text><Text>{formatINR(Math.max(0,budget-spent))} remaining</Text></View>
     {pct>=80&&<Text style={s.alert}>⚠️ You are approaching your monthly budget.</Text>}
    </>:<Text style={s.hint}>Set a budget above to track your spending against it.</Text>}
   </Section>}

   {tab==='categories'&&<Section title="Categories">
    <View style={s.rowInline}><TextInput style={[s.input,{flex:1}]} placeholder="New category name" value={newCat} onChangeText={setNewCat}/><TouchableOpacity style={s.addCatBtn} onPress={addCategory}><Text style={s.primaryText}>＋ Add</Text></TouchableOpacity></View>
    <View style={s.catGrid}>{cats.map(c=><View style={s.catChip} key={c.id}><Text style={s.chipText}>{c.icon} {c.name}</Text>{c.id.startsWith('custom-')&&<TouchableOpacity onPress={()=>removeCategory(c.id)}><Text style={s.danger}> ✕</Text></TouchableOpacity>}</View>)}</View>
   </Section>}

   {tab==='profile'&&<>
    <Section title="Profile photo">
     <View style={s.avatarPreviewRow}><View style={s.avatarCircleLg}><Text style={s.avatarEmojiLg}>{profile.avatar||'🙂'}</Text></View></View>
     <Text style={s.label}>Choose an avatar</Text>
     <View style={s.catGrid}>
      {avatarChoices.map(em=><TouchableOpacity key={em} onPress={()=>setProfile({...profile,avatar:em})} style={[s.chip,profile.avatar===em&&s.selected]}><Text style={{fontSize:20}}>{em}</Text></TouchableOpacity>)}
     </View>
    </Section>
    <Section title="Profile">
     <Text style={s.label}>First name</Text>
     <TextInput style={s.input} value={profile.firstName||''} onChangeText={x=>setProfile({...profile,firstName:x})} placeholder="Jane"/>
     <Text style={s.label}>Last name</Text>
     <TextInput style={s.input} value={profile.lastName||''} onChangeText={x=>setProfile({...profile,lastName:x})} placeholder="Doe"/>
     <Text style={s.label}>Nickname</Text>
     <TextInput style={s.input} value={profile.nickName||''} onChangeText={x=>setProfile({...profile,nickName:x})} placeholder="How the dashboard greets you"/>
     <Text style={s.label}>Email</Text>
     <TextInput style={s.input} keyboardType="email-address" autoCapitalize="none" value={profile.email||''} onChangeText={x=>setProfile({...profile,email:x})} placeholder="jane@example.com"/>
     <Text style={s.hint}>Saved automatically, and encrypted at rest like the rest of your data. Set a nickname to personalize your dashboard greeting.</Text>
    </Section>
    <Section title="Backup & restore">
     <Text style={s.hint}>This app keeps everything private on your device only - there's no account or cloud sync. That means uninstalling the app (or your phone's normal app-data backup not being available) can erase your data. Export a backup before uninstalling or switching phones, then restore it here afterwards.</Text>
     <TouchableOpacity style={[s.secondary,{marginTop:14}]} onPress={exportBackup}><Text style={s.secondaryText}>⬇ Export backup</Text></TouchableOpacity>
     <Text style={[s.label,{marginTop:10}]}>Restore from backup</Text>
     <Text style={s.hint}>Open your backup file, copy all of its text, and paste it below.</Text>
     <TextInput style={[s.input,s.multiline]} multiline value={restoreText} onChangeText={setRestoreText} placeholder="Paste backup JSON here"/>
     <TouchableOpacity style={s.primary} onPress={restoreBackup}><Text style={s.primaryText}>Restore backup</Text></TouchableOpacity>
    </Section>
   </>}
  </ScrollView>
  <Nav/>
 </SafeAreaView>
}

const Section=({title,children})=><View style={s.section}><Text style={s.heading}>{title}</Text>{children}</View>;
const Stat=({t,v})=><View style={s.stat}><Text style={s.muted}>{t}</Text><Text style={s.statValue}>{v}</Text></View>;
const EmptyState=({icon,text,actionLabel,onAction})=><View style={s.empty}>
 <Text style={s.emptyIcon}>{icon}</Text>
 <Text style={s.emptyText}>{text}</Text>
 {actionLabel&&<TouchableOpacity style={s.secondary} onPress={onAction}><Text style={s.secondaryText}>{actionLabel}</Text></TouchableOpacity>}
</View>;
const Row=({e,cats,onEdit,onDelete})=>{
 const c=cats.find(c=>c.id===e.category);
 return <View style={s.row}>
  <Text style={s.emoji}>{c?.icon||'📦'}</Text>
  <View style={{flex:1}}><Text style={s.bold}>{e.description||c?.name||'Uncategorized'}</Text><Text style={s.muted}>{c?.name||'Uncategorized'} · {e.date}</Text></View>
  <Text style={s.bold}>{formatINR(e.amount)}</Text>
  <TouchableOpacity onPress={()=>onEdit(e)}><Text style={s.linkBtn}>Edit</Text></TouchableOpacity>
  <TouchableOpacity onPress={()=>onDelete(e.id)}><Text style={s.danger}>Delete</Text></TouchableOpacity>
 </View>
};

function MonthlyOverview({expenses,cats}){
 const m={};
 expenses.forEach(e=>{
  const k=e.date.slice(0,7);
  if(!m[k])m[k]={month:k,expense:0,income:0};
  if(isIncomeCategory(cats,e.category))m[k].income+=Number(e.amount);
  else m[k].expense+=Number(e.amount);
 });
 const rows=Object.values(m).sort((a,b)=>a.month.localeCompare(b.month)).slice(-6);
 const max=Math.max(1,...rows.map(r=>Math.max(r.expense,r.income)));
 return <View>
  {rows.map(r=><View key={r.month} style={{marginBottom:14}}>
   <Text style={s.bold}>{r.month}</Text>
   <View style={s.rowTop}><Text style={s.muted}>Expense</Text><Text style={s.muted}>{formatINR(r.expense)}</Text></View>
   <View style={s.track}><View style={[s.fill,{width:(r.expense/max*100)+'%'}]}/></View>
   <View style={[s.rowTop,{marginTop:6}]}><Text style={s.muted}>Income</Text><Text style={s.muted}>{formatINR(r.income)}</Text></View>
   <View style={s.track}><View style={[s.fill,s.fillWarn,{width:(r.income/max*100)+'%'}]}/></View>
  </View>)}
  {!rows.length&&<EmptyState icon="📈" text="No data yet. Start adding expenses or income to see monthly trends."/>}
 </View>
}

function Calendar({year,month,spendByDay,onSelectDay,onPrev,onNext}){
 const cells=useMemo(()=>buildCalendarGrid(year,month),[year,month]);
 const todayKey=today();
 return <View>
  <View style={s.rowTop}>
   <Text style={s.bold}>{monthNames[month]} {year}</Text>
   <View style={{flexDirection:'row',gap:14}}><TouchableOpacity onPress={onPrev}><Text style={s.navArrow}>‹</Text></TouchableOpacity><TouchableOpacity onPress={onNext}><Text style={s.navArrow}>›</Text></TouchableOpacity></View>
  </View>
  <View style={s.calRow}>{weekdayLabels.map(w=><Text style={s.calDow} key={w}>{w}</Text>)}</View>
  <View style={s.calGrid}>
   {cells.map((c,i)=>{
    const key=dateKey(c.y,c.m,c.day);
    const amt=spendByDay[key];
    return <TouchableOpacity key={i} disabled={!c.inMonth} onPress={()=>onSelectDay(key)}
     style={[s.calCell,!c.inMonth&&s.calOut,key===todayKey&&s.calToday,amt&&s.calSpend]}>
     <Text style={s.calDay}>{c.day}</Text>
     {amt?<Text style={s.calAmt} numberOfLines={1}>{formatINR(amt).replace('₹','')}</Text>:null}
    </TouchableOpacity>
   })}
  </View>
 </View>
}

// NOTE ON TEXT WEIGHTS: numeric string font weights ('700','800') are not reliably rendered
// by every Android OS version/device - on some it silently fails to draw the glyphs at all,
// which is what caused labels and nav text to appear missing. 'bold' is the one weight RN
// guarantees works everywhere, so every heavier style below uses that instead. Every text
// style also sets an explicit `color` rather than relying on an inherited/default color, and
// borders/backgrounds use higher-contrast tones so fields are clearly visible against white.
const GREEN='#5FA429',GREEN_TINT='#E8F3D9',DARK='#151717',BG='#F0F2E9',BORDER='#C9D0BC',MUTED='#586154',WARN='#B23B3B';
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:BG},
 container:{padding:20,paddingBottom:110},
 loadingWrap:{flex:1,alignItems:'center',justifyContent:'center'},
 title:{fontSize:26,fontWeight:'bold',color:DARK},
 muted:{color:MUTED,marginTop:4},
 mutedLight:{color:'#d7dce6'},
 heroHint:{color:'#e9f5cf',marginTop:10,fontWeight:'bold',fontSize:12},
 greetRow:{flexDirection:'row',alignItems:'center',gap:12,marginTop:6},
 avatarCircle:{width:52,height:52,borderRadius:26,backgroundColor:GREEN_TINT,alignItems:'center',justifyContent:'center'},
 avatarEmoji:{fontSize:26},
 avatarPreviewRow:{alignItems:'center',marginBottom:14},
 avatarCircleLg:{width:88,height:88,borderRadius:44,backgroundColor:GREEN_TINT,alignItems:'center',justifyContent:'center'},
 avatarEmojiLg:{fontSize:44},
 hero:{backgroundColor:DARK,borderRadius:22,padding:22,marginTop:16},
 heroRow:{flexDirection:'row',alignItems:'center'},
 heroCol:{flex:1},
 heroDivider:{width:1,alignSelf:'stretch',backgroundColor:'rgba(255,255,255,0.18)',marginHorizontal:16},
 total:{fontSize:30,fontWeight:'bold',color:'#fff',marginVertical:8},
 totalWarn:{color:'#FFB4AC'},
 two:{flexDirection:'row',gap:12,marginTop:14},
 stat:{backgroundColor:'#fff',borderRadius:16,padding:16,flex:1,borderWidth:1.5,borderColor:BORDER},
 statValue:{fontSize:18,fontWeight:'bold',marginTop:8,color:DARK},
 section:{backgroundColor:'#fff',borderRadius:18,padding:18,marginTop:16,borderWidth:1.5,borderColor:BORDER},
 heading:{fontSize:19,fontWeight:'bold',marginBottom:12,color:DARK},
 row:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:12,borderBottomWidth:1,borderBottomColor:BORDER},
 rowTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:8},
 rowInline:{flexDirection:'row',gap:8,alignItems:'center',marginBottom:14},
 emoji:{fontSize:24},
 bold:{fontWeight:'bold',color:DARK},
 danger:{color:'#b23b3b',fontWeight:'bold'},
 linkBtn:{color:'#2F6FE0',fontWeight:'bold'},
 label:{fontWeight:'bold',marginTop:12,marginBottom:7,color:DARK,fontSize:14},
 smallLabel:{fontSize:11,fontWeight:'bold',color:MUTED,marginBottom:5},
 hint:{fontSize:12,color:MUTED,marginTop:8,lineHeight:17},
 dateToggle:{marginTop:12,marginBottom:4},
 input:{borderWidth:1.5,borderColor:BORDER,borderRadius:11,padding:13,fontSize:16,backgroundColor:'#fff',color:DARK},
 multiline:{height:110,textAlignVertical:'top',marginTop:10},
 chip:{flexDirection:'row',alignItems:'center',paddingVertical:10,paddingHorizontal:14,backgroundColor:BG,borderRadius:20,marginRight:8,marginBottom:8,borderWidth:1,borderColor:BORDER},
 chipText:{color:DARK,fontSize:14},
 selected:{borderWidth:2,borderColor:DARK,backgroundColor:GREEN_TINT},
 primary:{backgroundColor:DARK,padding:16,borderRadius:12,alignItems:'center',marginTop:18},
 primaryText:{color:'#fff',fontWeight:'bold',fontSize:15},
 secondary:{backgroundColor:GREEN_TINT,padding:13,borderRadius:12,alignItems:'center',marginTop:12,marginBottom:10,borderWidth:1,borderColor:'#cfe3b3'},
 secondaryText:{color:'#33500f',fontWeight:'bold'},
 cancel:{padding:14,alignItems:'center',marginTop:8},
 cancelText:{color:MUTED,fontWeight:'bold'},
 addCatBtn:{backgroundColor:DARK,paddingHorizontal:16,paddingVertical:13,borderRadius:11},
 catGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},
 catChip:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:BG,borderRadius:20,paddingVertical:9,paddingHorizontal:13,borderWidth:1,borderColor:BORDER},
 big:{fontSize:36,fontWeight:'bold',marginVertical:7,color:DARK},
 alert:{marginTop:14,padding:12,borderRadius:12,backgroundColor:'#FBE4C0',color:'#5c3a06',fontWeight:'bold'},
 track:{height:12,backgroundColor:BG,borderRadius:20,overflow:'hidden',marginVertical:10,borderWidth:1,borderColor:BORDER},
 fill:{height:'100%',backgroundColor:GREEN},
 fillWarn:{backgroundColor:'#D98416'},
 metric:{paddingVertical:8},
 empty:{alignItems:'center',paddingVertical:26,gap:8},
 emptyIcon:{fontSize:30},
 emptyText:{color:MUTED,textAlign:'center',paddingHorizontal:12},
 calRow:{flexDirection:'row',marginTop:10},
 calDow:{flex:1,textAlign:'center',fontSize:11,fontWeight:'bold',color:MUTED},
 calGrid:{flexDirection:'row',flexWrap:'wrap'},
 calCell:{width:'14.28%',aspectRatio:1,alignItems:'center',justifyContent:'center',padding:2},
 calOut:{opacity:.35},
 calToday:{borderWidth:1.5,borderColor:DARK,borderRadius:10},
 calSpend:{backgroundColor:GREEN_TINT,borderRadius:10},
 calSelectedCell:{backgroundColor:DARK,borderRadius:10},
 calDay:{fontSize:12,fontWeight:'bold',color:DARK},
 calDaySelected:{color:'#fff'},
 calAmt:{fontSize:8,fontWeight:'bold',color:'#3d6b12'},
 calSelected:{borderTopWidth:1,borderTopColor:BORDER,paddingTop:10,marginTop:6},
 nav:{position:'absolute',bottom:0,left:0,right:0,height:74,backgroundColor:'#fff',borderTopWidth:1.5,borderTopColor:BORDER,flexDirection:'row',alignItems:'center',paddingHorizontal:2},
 navItem:{flex:1,alignItems:'center',justifyContent:'center',paddingTop:6,paddingBottom:6},
 navIcon:{fontSize:19,color:'#5b645b'},
 navText:{fontSize:9,color:'#5b645b',fontWeight:'600',textAlign:'center',includeFontPadding:false},
 navActive:{color:DARK},
 navTextActive:{fontSize:9,fontWeight:'bold',color:DARK,textAlign:'center',includeFontPadding:false},
 navArrow:{fontSize:18,fontWeight:'bold',color:DARK,paddingHorizontal:6}
});
