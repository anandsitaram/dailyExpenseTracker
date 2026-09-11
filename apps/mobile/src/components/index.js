import React,{useEffect,useMemo,useState} from 'react';
import {SafeAreaView,View,Text,TextInput,TouchableOpacity,ScrollView} from 'react-native';
import {Swipeable} from 'react-native-gesture-handler';
import {ChevronLeft,ChevronRight,Lock,Pencil,Trash2} from 'lucide-react-native';
import {formatINR,monthNames,weekdayLabels,dateKey,buildCalendarGrid,isIncomeCategory} from '../../../../packages/core/src/index.js';
import {verifyBiometricUnlock} from '../services/index.js';
import s,{DARK} from '../styles/styles.js';
const today=()=>new Date().toISOString().slice(0,10);
function LockScreen({appLock,onUnlock}){
 const [pin,setPin]=useState(''),[error,setError]=useState(''),[usePin,setUsePin]=useState(appLock.mode!=='biometric');
 useEffect(()=>{
  if(appLock.mode==='biometric'&&!usePin){
   verifyBiometricUnlock().then(ok=>{if(ok)onUnlock();else setUsePin(true)});
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[usePin]);
 function tryPin(){
  if(pin===appLock.pin)onUnlock();
  else{setError('Incorrect PIN');setPin('')}
 }
 return <SafeAreaView style={s.safe}>
  <View style={s.lockWrap}>
   <Lock size={40} color={DARK} strokeWidth={1.6} style={{marginBottom:6}}/>
   <Text style={s.title}>Locked</Text>
   <Text style={s.muted}>{usePin?'Enter your PIN to continue':'Unlock with Face ID / fingerprint'}</Text>
   {usePin?<>
    <TextInput style={[s.input,s.pinInput]} keyboardType="numeric" secureTextEntry maxLength={6} value={pin} onChangeText={t=>{setPin(t);setError('')}} placeholder="••••" autoFocus/>
    {!!error&&<Text style={s.danger}>{error}</Text>}
    <TouchableOpacity style={s.primary} onPress={tryPin}><Text style={s.primaryText}>Unlock</Text></TouchableOpacity>
    {appLock.mode==='biometric'&&<TouchableOpacity style={s.cancel} onPress={()=>setUsePin(false)}><Text style={s.cancelText}>Use Face ID / fingerprint instead</Text></TouchableOpacity>}
   </>:<TouchableOpacity style={s.primary} onPress={()=>verifyBiometricUnlock().then(ok=>ok?onUnlock():setUsePin(true))}><Text style={s.primaryText}>Try again</Text></TouchableOpacity>}
  </View>
 </SafeAreaView>
}

function PinSetupForm({pinDraft,setPinDraft,pinConfirm,setPinConfirm,onSave,onCancel}){
 return <View style={{marginTop:12}}>
  <Text style={s.label}>New PIN (4-6 digits)</Text>
  <TextInput style={s.input} keyboardType="numeric" secureTextEntry maxLength={6} value={pinDraft} onChangeText={setPinDraft} placeholder="••••"/>
  <Text style={s.label}>Confirm PIN</Text>
  <TextInput style={s.input} keyboardType="numeric" secureTextEntry maxLength={6} value={pinConfirm} onChangeText={setPinConfirm} placeholder="••••"/>
  <TouchableOpacity style={s.primary} onPress={onSave}><Text style={s.primaryText}>Save PIN</Text></TouchableOpacity>
  <TouchableOpacity style={s.cancel} onPress={onCancel}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
 </View>
}

function Onboarding({onDone}){
 return <SafeAreaView style={s.safe}>
  <ScrollView contentContainerStyle={[s.container,{flexGrow:1,justifyContent:'center'}]}>
   <Text style={s.onboardEmoji}>💰</Text>
   <Text style={[s.title,{textAlign:'center'}]}>Welcome to Daily Expense Tracker</Text>
   <Text style={[s.muted,{textAlign:'center',marginTop:6,marginBottom:26}]}>A few things before you start:</Text>
   <View style={s.onboardRow}>
    <Text style={s.onboardIcon}>✍️</Text>
    <View style={{flex:1}}><Text style={s.bold}>Log expenses in seconds</Text><Text style={s.muted}>Tap a date on the calendar, or the + tab, to add one. No account or setup needed.</Text></View>
   </View>
   <View style={s.onboardRow}>
    <Text style={s.onboardIcon}>🎯</Text>
    <View style={{flex:1}}><Text style={s.bold}>Set a budget anytime</Text><Text style={s.muted}>See exactly what&apos;s left to spend this month, overall or per category.</Text></View>
   </View>
   <View style={s.onboardRow}>
    <Text style={s.onboardIcon}>🔒</Text>
    <View style={{flex:1}}><Text style={s.bold}>Everything stays private</Text><Text style={s.muted}>Your data is encrypted on this device and never leaves it unless you export a backup yourself.</Text></View>
   </View>
   <TouchableOpacity style={[s.primary,{marginTop:30}]} onPress={onDone} accessibilityRole="button"><Text style={s.primaryText}>Get started</Text></TouchableOpacity>
  </ScrollView>
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
 const label=e.description||c?.name||'Uncategorized';
 // swipe is a shortcut; Edit/Delete links stay visible for discoverability/a11y
 const renderRightActions=()=><View style={{flexDirection:'row'}}>
  <TouchableOpacity style={s.swipeEdit} onPress={()=>onEdit(e)} accessibilityRole="button" accessibilityLabel={`Edit ${label}`}><Pencil size={18} color="#fff"/></TouchableOpacity>
  <TouchableOpacity style={s.swipeDelete} onPress={()=>onDelete(e.id)} accessibilityRole="button" accessibilityLabel={`Delete ${label}`}><Trash2 size={18} color="#fff"/></TouchableOpacity>
 </View>;
 return <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
  <View style={s.row}>
   <Text style={s.emoji}>{c?.icon||'📦'}</Text>
   <View style={{flex:1}}><Text style={s.bold}>{label}</Text><Text style={s.muted}>{c?.name||'Uncategorized'} · {e.date}{e.recurringId?' · 🔁':''}</Text></View>
   <Text style={s.bold}>{formatINR(e.amount)}</Text>
   <TouchableOpacity onPress={()=>onEdit(e)} accessibilityRole="button" accessibilityLabel={`Edit ${label}`}><Text style={s.linkBtn}>Edit</Text></TouchableOpacity>
   <TouchableOpacity onPress={()=>onDelete(e.id)} accessibilityRole="button" accessibilityLabel={`Delete ${label}`}><Text style={s.danger}>Delete</Text></TouchableOpacity>
  </View>
 </Swipeable>
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
   <View style={{flexDirection:'row',gap:14}}><TouchableOpacity onPress={onPrev} style={s.calNavBtn} accessibilityRole="button" accessibilityLabel="Previous month"><ChevronLeft size={18} color={DARK} strokeWidth={2.4}/></TouchableOpacity><TouchableOpacity onPress={onNext} style={s.calNavBtn} accessibilityRole="button" accessibilityLabel="Next month"><ChevronRight size={18} color={DARK} strokeWidth={2.4}/></TouchableOpacity></View>
  </View>
  <View style={s.calRow}>{weekdayLabels.map(w=><Text style={s.calDow} key={w}>{w}</Text>)}</View>
  <View style={s.calGrid}>
   {cells.map((c,i)=>{
    const key=dateKey(c.y,c.m,c.day);
    const amt=spendByDay[key];
    return <TouchableOpacity key={i} disabled={!c.inMonth} onPress={()=>onSelectDay(key)}
     style={[s.calCell,!c.inMonth&&s.calOut,key===todayKey&&s.calToday,amt&&s.calSpend]}>
     <Text style={s.calDay} maxFontSizeMultiplier={1.3}>{c.day}</Text>
     {amt?<Text style={s.calAmt} numberOfLines={1} maxFontSizeMultiplier={1.2}>{formatINR(amt).replace('₹','')}</Text>:null}
    </TouchableOpacity>
   })}
  </View>
 </View>
}

// numeric font weights ('700'/'800') don't render on some Android versions; use 'bold'

export {Section,Stat,EmptyState,Row,MonthlyOverview,Calendar,LockScreen,PinSetupForm,Onboarding};
