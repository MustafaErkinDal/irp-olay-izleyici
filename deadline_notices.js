// Teslim süresi bildirimleri. Motorda süreye bağlı görev bildirimi kuralı yok (motor eksiği 20);
// bildirim, okuyanın görebildiği görevlerden (WEB_GOREVLER) ekranda hesaplanır ve çekirdek
// bildirimlerinin yanında listelenir. Kimlik "EKRAN:" ile başlar; okundu bilgisi yalnız bu cihazdadır.
//  Yaklaşıyor: teslim saati yazılıysa 4 saat kala, yoksa teslim gününden önceki iş gününün başında;
//   yalnız görevin sahibine.
//  Geçti: teslim anı geçince; görevin sahibine, atayana, onaylayana ve sahibinin birim yöneticisine.
// Teslim edilmiş (onay bekleyen), biten, iptal edilen ve revizyonda bekleyen görev bildirim üretmez.
import {arr,idOf,date} from './ui.js';
import {validDay} from './temporal.js';
import {superiors} from './time_model.js';
import {workdayFn} from './stage_template_model.js';
import {MotorCalendar} from './calendar_read.js';

export const LOCAL_NOTICE_PREFIX='EKRAN:';
export const isLocalNotice=id=>String(id??'').startsWith(LOCAL_NOTICE_PREFIX);
const ACTIVE=new Set(['ATANDI','ACIK','ON_IS_BEKLIYOR','REDDEDILDI']);
const HOUR=3600000;
const validClock=v=>/^([01]\d|2[0-3]):[0-5]\d/.test(String(v??''));
const at=(day,clock)=>Date.parse(`${day}T${String(clock).slice(0,5)}:00+03:00`);
const prevDay=day=>{const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10);};

// Teslim anı: teslim saati, yoksa motorun yazdığı takvim mesai bitişi, yoksa 18:00.
export function dueMoment(task){
 if(!validDay(String(task?.teslim_tarihi??'').slice(0,10)))return null;
 const day=String(task.teslim_tarihi).slice(0,10);
 const clock=validClock(task.teslim_saati)?task.teslim_saati:validClock(task.takvim_teslim_saati)?task.takvim_teslim_saati:'18:00';
 return {day,ms:at(day,clock),saatli:validClock(task.teslim_saati),clock:String(clock).slice(0,5)};
}
// "Yaklaşıyor" eşiği.
export function warnMoment(task,isWork,unit){
 const due=dueMoment(task);if(!due)return null;
 if(due.saatli)return due.ms-4*HOUR;
 let d=prevDay(due.day);for(let i=0;i<30&&!isWork(d,unit);i++)d=prevDay(d);
 return isWork(d,unit)?at(d,'00:00'):null;
}
// Geçti bildiriminin alıcıları: sahip, atayan, onaylayan, sahibinin birim yöneticisi.
export function overdueRecipients(task,{people=[],units=[]}={}){
 const boss=task.kisi?superiors(people,units,task.kisi)[0]:null;
 return [...new Set([task.kisi,task.veren,task.onay_gerekli===false?null:task.onaylayan,boss].filter(Boolean))];
}
export function deadlineNotices(tasks,{person,people=[],units=[],resources=null,now=Date.now(),isWork=null,calendarReady=true}={}){
 if(!person)return [];
 const work=isWork??workdayFn(resources,units),name=id=>people.find(p=>idOf(p)===id)?.ad??'Çalışan',out=[];
 for(const t of arr(tasks)){
  const id=idOf(t);if(!id||!ACTIVE.has(t.durum)||['ONAY','NOT'].includes(t.tur))continue;
  const due=dueMoment(t);if(!due)continue;
  const unit=people.find(p=>idOf(p)===t.kisi)?.birim??null;
  const when=`${date(due.day)} ${due.clock}`,title=t.ad??t.is_tanimi??'Görev';
  const base={kaynak:'EKRAN',is_akisi:true,alici:person,hedef_tur:'GOREV',hedef:id};
  if(now>=due.ms){
   if(overdueRecipients(t,{people,units}).includes(person))out.push({...base,kimlik:`${LOCAL_NOTICE_PREFIX}SURE:${id}:GECTI`,an:new Date(due.ms).toISOString(),
    baslik:'Teslim Süresi Geçti',metin:`${title} — teslim ${when} idi${t.kisi===person?'':` (${name(t.kisi)})`}. Görev henüz teslim edilmedi.`});
  }
  const warn=t.kisi!==person||!due.saatli&&!calendarReady?null:warnMoment(t,work,unit);
  // Süresi geçtikten sonra atanan görev için "yaklaşıyor" üretilmez.
  const assigned=Date.parse(t.atama_ani??'');
  if(t.kisi===person&&warn!=null&&now>=warn&&(now<due.ms||Number.isFinite(assigned)&&assigned<due.ms))out.push({...base,kimlik:`${LOCAL_NOTICE_PREFIX}SURE:${id}:YAKLASIYOR`,an:new Date(Math.max(warn,Date.parse(t.atama_ani??'')||0)).toISOString(),
   baslik:'Teslim Süresi Yaklaşıyor',metin:`${title} — teslim ${when}. ${due.saatli?'4 saatten az kaldı.':'Teslime 1 iş gününden az kaldı.'}`});
 }
 return out;
}
// Okuyanın önbellekteki bütün görevleri (sayfa okuması ve kendi görevleri) birleştirilir.
export function cachedTasks(client){
 const map=new Map();
 for(const rows of [client.cached?.('WEB_GOREVLER'),client.cached?.('WEB_GOREVLER',null,{kisi:client.person})])for(const r of arr(rows))map.set(idOf(r),r);
 return [...map.values()];
}
// Bildirim listesinin satırları: çekirdek bildirimleri + teslim süresi bildirimleri.
const calendarViews=new WeakMap();
export function noticeRows(client,core=client.cached?.('BILDIRIMLER',client.person)){
 if(client.readonly)return arr(core);
 const tasks=cachedTasks(client),args={person:client.person,people:client.people,units:client.units,resources:client.cached?.('WEB_KAYNAKLAR')??null,now:Date.now()+(client.offset??0)};
 // Saatli/geçmiş teslim uyarıları takvim beklemez. Saatsiz yaklaşma uyarısı
 // ancak motorun tarihli çalışma günü bilgisi geldikten sonra gösterilir.
 const needs=tasks.some(t=>t.kisi===client.person&&ACTIVE.has(t.durum)&&!['ONAY','NOT'].includes(t.tur)&&dueMoment(t)&&!dueMoment(t).saatli);
 let calendar=calendarViews.get(client);
 if(needs&&typeof client.read==='function'){
  const stamp=JSON.stringify([client.person,client.generation,client.today,tasks,client.readVersions?.get(JSON.stringify(['WEB_KAYNAKLAR',null,{}]))]);
  if(calendar?.stamp!==stamp){
   calendar={stamp,pending:true};calendarViews.set(client,calendar);const loader=new MotorCalendar(client,{maxAge:30000});
   void loader.calculate(isWork=>{deadlineNotices(tasks,{...args,isWork});return isWork;},{scope:{kisi:client.person}}).then(work=>{if(calendarViews.get(client)!==calendar)return;calendar.pending=false;calendar.work=work;client.emit?.('data');},ex=>{if(calendarViews.get(client)!==calendar)return;calendar.pending=false;calendar.error=ex.message;});
  }
 }
 const extra=deadlineNotices(tasks,{...args,isWork:calendar?.work??(()=>false),calendarReady:!needs||!!calendar?.work});
 return [...arr(core),...extra];
}
