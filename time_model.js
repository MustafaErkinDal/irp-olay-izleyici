// Tur 5 çalışma zamanı ekranlarının saf yardımcıları. Sonuç ve yetki sunucuda kalır;
// burada yalnız gösterim, form ön denetimi ve mevcut kayıtların okunması yapılır.
import {idOf,arr} from './ui.js';
import {validDay,validTime,nextDay} from './temporal.js';

const TZ='+03:00';
const dayFmt=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul'});
const clockFmt=new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',hour:'2-digit',minute:'2-digit',hour12:false});
export const localDay=value=>dayFmt.format(new Date(value));
export const localClock=value=>clockFmt.format(new Date(value)).replace(/^24:/,'00:');
export const at=(day,clock)=>Date.parse(`${day}T${clock}:00${TZ}`);
export function prevDay(day){const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10);}
export function isoWeekday(day){const w=new Date(day+'T12:00:00Z').getUTCDay();return w===0?7:w;}
export function weekStart(now){const today=localDay(now);let d=today;for(let i=1;i<isoWeekday(today);i++)d=prevDay(d);return at(d,'00:00');}
export function daysBetween(first,last){const out=[];let d=first;for(let i=0;i<400&&d<=last;i++){out.push(d);d=nextDay(d);}return out;}
export const minutesText=m=>{m=Math.round(Number(m)||0);const h=Math.floor(m/60),r=m%60;return h&&r?`${h} sa ${r} dk`:h?`${h} sa`:`${r} dk`;};

// Kişinin üst zinciri: birim başı/yöneticileri, sonra üst birimler. İlk eleman doğrudan alıcıdır.
export function superiors(people,units,person){
 const p=arr(people).find(x=>idOf(x)===person);if(!p)return [];
 const byId=new Map(arr(units).map(u=>[idOf(u),u]));const out=[];let u=byId.get(p.birim),guard=0;
 while(u&&guard++<30){for(const h of [u.basi,...arr(u.yoneticileri).map(x=>typeof x==='string'?x:idOf(x))])if(h&&h!==person&&!out.includes(h))out.push(h);u=byId.get(u.ust??u.ust_birim);}
 return out;
}

// Kişinin o gündeki takvimi: özel gün, tatil, birim takvimi, firma takvimi. Bilinmiyorsa null.
export function calendarDay(resources,unit,day){
 if(!resources||!validDay(day))return null;
 const special=resources.gun_tanimlari&&!Array.isArray(resources.gun_tanimlari)?resources.gun_tanimlari[day]:arr(resources.gun_tanimlari).find(x=>x.tarih===day);
 const base=unit?.takvim??resources.takvim;
 if(special?.tur==='TATIL'||arr(resources.tatiller).some(x=>(typeof x==='string'?x:x?.tarih)===day))return {known:true,working:false,reason:'Tatil'};
 if(special&&special.mesai_baslangic)return {known:true,working:true,start:special.mesai_baslangic,end:special.mesai_bitis,breaks:arr(special.sabit_molalar)};
 if(!base?.mesai_baslangic||!base?.mesai_bitis)return null;
 const working=arr(base.calisma_gunleri).includes(isoWeekday(day));
 return {known:true,working,start:base.mesai_baslangic,end:base.mesai_bitis,breaks:arr(base.sabit_molalar),reason:working?'':'Çalışma günü değil'};
}

export const LEAVE_STATUS={TALEP:'Yönetici Onayı Bekliyor',IK_BEKLIYOR:'İK Onayı Bekliyor',ONAYLI:'Onaylandı',REDDEDILDI:'Reddedildi',RET:'Reddedildi',IPTAL:'İptal Edildi'};
export const LEAVE_TONE={TALEP:'warn',IK_BEKLIYOR:'warn',ONAYLI:'good',REDDEDILDI:'bad',RET:'bad',IPTAL:'neutral'};
export const LEAVE_NAMES={YILLIK:'Yıllık İzin',SAATLIK:'Saatlik İzin',MAZERET:'Mazeret İzni',UCRETLI:'Ücretli İzin',UCRETSIZ:'Ücretsiz İzin',SAGLIK:'Sağlık İzni',SERBEST_ZAMAN:'Serbest Zaman'};
// Tam gün izin sözleşmede ertesi gün 00:00'da biter; ekranda seçilen son gün gösterilir.
export function leaveSpan(x){
 const startDay=localDay(x.baslangic),endAt=localDay(x.bitis),st=localClock(x.baslangic),et=localClock(x.bitis);
 const full=st==='00:00'&&et==='00:00';
 return {full,startDay,endDay:full?prevDay(endAt):endAt,startTime:full?null:st,endTime:full?null:et};
}
export function leaveOpen(x){return ['TALEP','IK_BEKLIYOR'].includes(x?.durum);}
export const createdKey=id=>String(id??'').split('-')[1]??'';
export function newestFirst(rows){return [...rows].sort((a,b)=>createdKey(idOf(b)).localeCompare(createdKey(idOf(a)))||String(idOf(b)).localeCompare(String(idOf(a))));}

// İzin formunun ön denetimi: biçim, mevcut hafta sınırı ve gerçek takvim. Sunucu kuralı ayrıca uygulanır.
export function leaveIssues(v,{now=Date.now(),calendar=()=>null,overtime=[],checkCalendar=true}={}){
 const issues=[],add=(path,message)=>issues.push({path,message});
 const hourly=v.tur==='SAATLIK'||v.saat_belirle===true;
 if(!v.tur)add('tur','İzin türünü seçin.');
 if(!validDay(v.baslangic))add('baslangic','Başlangıç için tam ve geçerli bir tarih girin (gün.ay.yıl).');
 if(!validDay(v.bitis))add('bitis','Bitiş için tam ve geçerli bir tarih girin (gün.ay.yıl).');
 if(hourly){
  if(!validTime(v.baslangic_saati))add('baslangic_saati','Başlangıç saati için 24 saat biçiminde geçerli bir saat girin (09:30).');
  if(!validTime(v.bitis_saati))add('bitis_saati','Bitiş saati için 24 saat biçiminde geçerli bir saat girin (09:30).');
 }
 if(!String(v.gerekce??'').trim())add('gerekce','Gerekçe gerekli.');
 if(issues.some(i=>i.path!=='gerekce'))return issues;
 const start=at(v.baslangic,hourly?v.baslangic_saati:'00:00'),end=hourly?at(v.bitis,v.bitis_saati):at(nextDay(v.bitis),'00:00');
 if(!(start<end)){add(hourly&&v.baslangic===v.bitis?'bitis_saati':'bitis','Bitiş, başlangıçtan sonra olmalı.');return issues;}
 if(start<now&&start<weekStart(now))add('baslangic','Geçmiş tarihli talep yalnız içinde bulunduğunuz hafta için yapılabilir.');
 if(!checkCalendar)return issues;
 const days=daysBetween(v.baslangic,v.bitis),cals=days.map(d=>calendar(d));
 if(cals.some(c=>!c)){add('baslangic','Çalışma takvimi okunamadı; izin uygunluğu doğrulanamadı. Bağlantıyı kontrol edip yeniden deneyin.');return issues;}
 const inOvertime=(a,b)=>overtime.some(o=>o.start<=a&&b<=o.end);
 if(hourly){
  const first=cals[0],last=cals.at(-1);
  const startOk=first.working&&at(v.baslangic,first.start)<=start&&start<at(v.baslangic,first.end);
  const endOk=last.working&&at(v.bitis,last.start)<end&&end<=at(v.bitis,last.end);
  if(!(startOk&&endOk)&&!inOvertime(start,end)){
   if(!first.working)add('baslangic','Seçilen gün çalışma günü değil. İzin yalnız çalışma saatleri için istenir.');
   else if(!startOk)add('baslangic_saati',`Başlangıç saati mesai içinde olmalı (${first.start}–${first.end}).`);
   if(last.working&&!endOk)add('bitis_saati',`Bitiş saati mesai içinde olmalı (${last.start}–${last.end}).`);
   else if(!last.working&&first!==last)add('bitis','Bitiş günü çalışma günü değil.');
  }
 }else if(!cals.some(c=>c.working))add('baslangic','Seçilen tarihlerde çalışma günü yok.');
 return issues;
}

export function overtimeWindow(x){const start=at(x.tarih,x.baslangic);let end=at(x.tarih,x.bitis);if(end<=start)end=at(nextDay(x.tarih),x.bitis);return {start,end};}
export const OVERTIME_TEXT={IPTAL:'İptal Edildi',GERCEKLESTI:'Gerçekleşen · Onaylandı',PLANLANDI:'Planlandı',SURUYOR:'Plan Saatinde',SURESI_DOLDU:'Plan Süresi Doldu'};
export const OVERTIME_TONE={IPTAL:'neutral',GERCEKLESTI:'good',PLANLANDI:'info',SURUYOR:'warn',SURESI_DOLDU:'neutral'};
export function overtimeState(x,now=Date.now()){
 if(x.iptal)return 'IPTAL';if(x.damga)return 'GERCEKLESTI';
 const w=overtimeWindow(x);return w.start>now?'PLANLANDI':w.end>now?'SURUYOR':'SURESI_DOLDU';
}
export const overtimeActive=(x,now)=>['PLANLANDI','SURUYOR'].includes(overtimeState(x,now));
export const overtimeMinutes=x=>{const w=overtimeWindow(x);return Math.round((w.end-w.start)/60000);};

// Ek mesai formunun ön denetimi; normal mesai, onaylı izin ve diğer kayıtlarla çakışmayı gösterir.
export function overtimeIssues(v,{mode='PLAN',now=Date.now(),calendar=()=>null,leaves=[],plans=[],yaka='BEYAZ',checkCalendar=true}={}){
 const issues=[],add=(path,message)=>issues.push({path,message});
 if(!v.kisi)add('kisi','Çalışanı seçin.');
 if(!v.hedef)add('hedef','Bu çalışanın ek mesai yapacağı işi seçin.');
 if(!validDay(v.tarih))add('tarih','Tarih için tam ve geçerli bir tarih girin (gün.ay.yıl).');
 if(!validTime(v.baslangic))add('baslangic','Başlangıç için 24 saat biçiminde geçerli bir saat girin (18:30).');
 if(!validTime(v.bitis))add('bitis','Bitiş için 24 saat biçiminde geçerli bir saat girin (19:30).');
 if(mode==='PLAN'&&!String(v.aciklama??'').trim())add('aciklama','Açıklama gerekli.');
 if(issues.some(i=>['tarih','baslangic','bitis'].includes(i.path)))return issues;
 const {start,end}=overtimeWindow(v);
 if(mode==='PLAN'&&start<=now)add('baslangic','Planın başlangıcı şu andan sonra olmalı. Geçmiş çalışmayı Geçmiş ve Gerçekleşen bölümünden onaylayın.');
 if(mode==='ONAY'){
  if(end>now)add('bitis','Gerçekleşen mesai bitmiş bir aralık olmalı. Gelecek çalışma için plan oluşturun.');
  else if(start<now-7*86400000)add('tarih','Gerçekleşen mesai yalnız son 7 gün için onaylanabilir.');
 }
 if(!checkCalendar)return issues;
 const days=[...new Set([localDay(start),localDay(end-1)])];
 for(const d of days){const c=calendar(d);if(!c){add('tarih','Çalışma takvimi okunamadı; normal mesai çakışması denetlenemedi.');return issues;}
  if(c.working&&Math.max(start,at(d,c.start))<Math.min(end,at(d,c.end))){add('baslangic',`Bu saatler normal mesaiyle çakışıyor (${c.start}–${c.end}). Ek mesai mesai dışında olmalı.`);break;}}
 if(leaves.some(l=>l.kisi===v.kisi&&l.durum==='ONAYLI'&&Math.max(start,Date.parse(l.baslangic))<Math.min(end,Date.parse(l.bitis))))add('tarih','Bu aralıkta çalışanın onaylı izni var.');
 const clash=plans.find(p=>p.kisi===v.kisi&&!p.iptal&&(()=>{const w=overtimeWindow(p);return Math.max(start,w.start)<Math.min(end,w.end)&&!(mode==='ONAY'&&yaka==='BEYAZ'&&!p.damga&&w.start<=start&&end<=w.end);})());
 if(clash)add('baslangic','Bu aralıkta çalışanın başka bir ek mesai kaydı var.');
 return issues;
}

// Atölye zaman şeridi: aralıklar gerçek başlangıç sırasıyla ayrı ayrı durur; aynı tür toplanmaz.
export const KOVA_NAMES={CALISMA:'Çalışma',YENIDEN_ISLEME:'Yeniden İşleme',PLANSIZ:'Plansız Çalışma',BEKLEME:'Bekleme',BEKLEME_ARIZA:'Duruş Beklemesi',BEKLEME_ON_IS:'Ön İş Beklemesi',BEKLEME_ONAY:'Onay Beklemesi',ARIZA:'Duruş',MOLA:'Mola',SABIT_MOLA:'Sabit Mola',GECIS:'İşler Arası Geçiş',TANIMSIZ:'Eksik Süre',ON_IS_BEKLEME:'Ön İş Beklemesi',ONAY_BEKLEME:'Onay Beklemesi'};
export const KOVA_CLASS={CALISMA:'work',YENIDEN_ISLEME:'rework',PLANSIZ:'unplanned',BEKLEME:'wait',BEKLEME_ARIZA:'stop',BEKLEME_ON_IS:'wait',BEKLEME_ONAY:'wait',ON_IS_BEKLEME:'wait',ONAY_BEKLEME:'wait',ARIZA:'stop',MOLA:'break',SABIT_MOLA:'fixed-break',GECIS:'transition',TANIMSIZ:'missing'};
export function timelineSegments(intervals,now=Date.now()){
 return arr(intervals).filter(a=>a?.baslangic).map(a=>{const start=Date.parse(a.baslangic),end=a.bitis?Date.parse(a.bitis):Math.max(start,now);return {...a,start,end,open:!a.bitis,minutes:Math.max(0,(end-start)/60000),name:KOVA_NAMES[a.kova]??'Diğer Süre',css:KOVA_CLASS[a.kova]??'other'};})
  .filter(s=>s.end>s.start).sort((a,b)=>a.start-b.start||a.end-b.end);
}
export function timelineAxis(segments,calendar,day){
 const points=segments.flatMap(s=>[s.start,s.end]);
 if(calendar?.working){points.push(at(day,calendar.start),at(day,calendar.end));}
 if(!points.length)return null;
 const hour=3600000,min=Math.floor(Math.min(...points)/hour)*hour,max=Math.ceil(Math.max(...points)/hour)*hour;
 return {min,max:max>min?max:min+hour};
}
// Saat işlemi hangi işe aitse onu, açtığı ya da kapattığı aralıktan bulur.
export function eventJob(record,intervals){const list=arr(intervals);return (list.find(a=>a.acan_olay===record.kimlik)??list.find(a=>a.kapatan_olay===record.kimlik))?.is??record.is??record.hedef??null;}
export const CLOCK_EVENTS=['MESAI.GIRDIM','MESAI.CIKTIM','IS.BASLADIM','IS.MOLA_VERDIM','IS.ARIZA_BILDIRDIM','IS.DEVAM_ETTIM','IS.TAMAMLADIM','IS.SURE_EKLEDIM'];

// Gün sonu: durum adı, alıcı ve bağlama göre kullanılabilecek işlemler.
export function dayStatus(report,yaka){
 const d=report?.durum??'TASLAK',req=report?.onay_durumu!=='ONAY_GEREKMIYOR';
 if(d==='ONAYLANDI')return {key:d,text:'Onaylandı',tone:'good'};
 if(d==='DEGISTI')return {key:d,text:'Değişti · Yeniden İnceleme Bekliyor',tone:'warn'};
 if(d==='IADE')return {key:d,text:'İade Edildi',tone:'bad'};
 if(d==='GONDERILDI')return {key:d,text:req?'Gönderildi · Onay Bekliyor':'Gönderildi · Onay Gerekmiyor',tone:req?'warn':'info'};
 if(!req)return {key:'GEREKMIYOR',text:'Onay Gerekmiyor',tone:'neutral'};
 return {key:d,text:yaka==='MAVI'?'Onay Bekliyor':'Gönderilmedi',tone:yaka==='MAVI'?'warn':'neutral'};
}
export function dayActions({report,me,person,yaka,chain,today,day}){
 const d=report?.durum??'TASLAK',own=me===person,superior=!own&&chain.includes(me),past=day<=today,req=report?.onay_durumu!=='ONAY_GEREKMIYOR';
 const sendable=own&&yaka==='BEYAZ'&&past&&d!=='ONAYLANDI';
 return {
  send:sendable&&chain.length>0,
  noRecipient:own&&yaka==='BEYAZ'&&chain.length===0,
  approve:superior&&past&&(yaka==='MAVI'?['TASLAK','GONDERILDI','DEGISTI'].includes(d):['GONDERILDI','DEGISTI'].includes(d)),
  optional:!req&&d!=='DEGISTI',
  returnBack:superior&&past&&yaka==='BEYAZ'&&['GONDERILDI','DEGISTI'].includes(d),
 };
}
export function dayEmpty(report,intervals){const o=report?.ozet??{};return !Object.keys(o.gorevler??{}).length&&!Object.keys(o.isler??{}).length&&!Object.values(o.kovalar??{}).some(v=>Number(v)>0)&&!arr(intervals).length;}

// Gecikme: ilk teslim, son teslim anından sonraysa gerçek geç teslimdir (sunucu kuralıyla aynı ölçü).
export function deadlineOf(g,mesaiEnd='18:00'){return g?.teslim_tarihi?at(g.teslim_tarihi,g.teslim_saati||g.takvim_teslim_saati||mesaiEnd):null;}
export function lateTasks(tasks,{bas,bit}={}){
 return arr(tasks).filter(g=>!['NOT','ONAY','REVIZYON'].includes(g.tur)&&g.ilk_teslim_ani&&deadlineOf(g)!=null&&Date.parse(g.ilk_teslim_ani)>deadlineOf(g))
  .filter(g=>{const d=localDay(g.ilk_teslim_ani);return (!bas||d>=bas)&&(!bit||d<=bit);})
  .sort((a,b)=>Date.parse(b.ilk_teslim_ani)-Date.parse(a.ilk_teslim_ani));
}
export function responsibilityRows(rows,taskId){
 const mine=arr(rows).filter(s=>arr(s.hedef).some(h=>h.kimlik===taskId));if(!mine.length)return [];
 const latest=mine.reduce((a,b)=>String(b.an??'')>String(a.an??'')?b:a).ret;
 return mine.filter(s=>s.ret===latest).sort((a,b)=>String(a.satir).localeCompare(String(b.satir),'tr',{numeric:true}));
}
export function shareState(s){return s.itirazda?{text:'İtiraz Bekliyor',tone:'warn'}:!s.dogrulandi?{text:'Doğrulama Bekliyor',tone:'warn'}:{text:'Kesinleşti',tone:'good'};}
export const rowNumber=s=>Number(String(s.satir??'').split('/').pop());

const WORDS={MALZEME:'Malzeme',EKSIK:'Eksik',HATALI:'Hatalı',GECIKTI:'Gecikti',DIGER:'Diğer',MAKINE:'Makine',CNC:'CNC',TORNA:'Torna',KAYNAK:'Kaynak',BEKLEME:'Bekleme',BIRIM:'Birim',MUSTERI:'Müşteri',BILGI:'Bilgi',TEKNIK:'Teknik',RESIM:'Resim',OLCU:'Ölçü',LISTE:'Liste',TASARIM:'Tasarım',HATA:'Hata',KIRILMA:'Kırılma',BOZULMA:'Bozulma',ISLETME:'İşletme',ELEKTRIK:'Elektrik',EGITIM:'Eğitim',TOPLANTI:'Toplantı',YONLENDIRME:'Yönlendirme',CALISAN:'Çalışan',KENDI:'Kendi'};
const word=w=>WORDS[String(w).toLocaleUpperCase('tr-TR')]??String(w).toLocaleLowerCase('tr-TR').replace(/^\p{L}/u,c=>c.toLocaleUpperCase('tr-TR'));
export function reasonOptions(codes){
 const list=arr(codes).filter(x=>x.liste==='DURUS_NEDENI'&&x.aktif!==false),byCode=new Map(list.map(x=>[x.kod,x]));
 return list.filter(x=>x.ust).map(x=>({value:x.kod,text:`${word(byCode.get(x.ust)?.ad??x.ust)} ${word(x.ad)}`})).sort((a,b)=>a.text.localeCompare(b.text,'tr'));
}
export function reasonText(code,codes){
 if(!code||['GIRILMEDI','BELIRTILMEDI'].includes(code))return 'Belirtilmedi';
 const bare=String(code).replace(/^DURUS_NEDENI\./,'');return reasonOptions(codes).find(o=>o.value===bare)?.text??(arr(codes).some(x=>x.kod===bare)?word(arr(codes).find(x=>x.kod===bare).ad):'Diğer Neden');
}
export const EXTERNAL=[{value:'MUSTERI',text:'Müşteri'},{value:'TEDARIKCI',text:'Tedarikçi'},{value:'ISLETME',text:'İşletme'}];
export function shareIssues(rows,{reason,gerekce}={}){
 const issues=[];let total=0;const seen=new Set();
 if(!reason)issues.push({path:'neden',message:'Gecikmenin nedenini seçin.'});
 rows.forEach((r,i)=>{if(!r.tur)issues.push({path:`pay.${i}.tur`,message:'Sorumlu türünü seçin.'});if(!r.kimlik)issues.push({path:`pay.${i}.kimlik`,message:'Sorumluyu seçin.'});
  if(!(Number.isFinite(r.yuzde)&&r.yuzde>=0&&r.yuzde<=100))issues.push({path:`pay.${i}.yuzde`,message:'Pay 0 ile 100 arasında olmalı.'});else total+=r.yuzde;
  const key=r.tur+':'+r.kimlik;if(r.kimlik&&seen.has(key))issues.push({path:`pay.${i}.kimlik`,message:'Aynı sorumlu iki kez seçilmiş.'});seen.add(key);});
 if(!rows.length)issues.push({path:'pay.0.kimlik',message:'En az bir sorumlu ekleyin.'});
 else if(!issues.some(i=>i.path.endsWith('.yuzde'))&&Math.abs(total-100)>1e-9)issues.push({path:'pay-toplam',message:`Payların toplamı 100 olmalı (şu an ${total}).`});
 if(!String(gerekce??'').trim())issues.push({path:'gerekce',message:'Gerekçe gerekli.'});
 return issues;
}

// Ek mesai listesi: süzme ve sıralama. times: {kimlik:{plan_ani,iptal_ani,...}} (okuma eki).
export const OVERTIME_SORTS=[['tarih_yeni','Mesai zamanı: en yeni üstte'],['tarih_eski','Mesai zamanı: en eski üstte'],['plan_yeni','Planlama zamanı: en yeni üstte'],['iptal_yeni','İptal zamanı: en yeni üstte']];
export function overtimeList(rows,{kisi='',durum='',is='',sort='tarih_yeni',times={},now=Date.now()}={}){
 const job=x=>{const h=arr0(x.hedef)[0];return h?h.kimlik:'';};
 const at=v=>Date.parse(v??'')||0,id=x=>x.kimlik,start=x=>overtimeWindow(x).start;
 const list=rows.filter(x=>(!kisi||x.kisi===kisi)&&(!durum||overtimeState(x,now)===durum)&&(!is||job(x)===is));
 const key={tarih_yeni:x=>-start(x),tarih_eski:x=>start(x),plan_yeni:x=>-at(times[id(x)]?.plan_ani),iptal_yeni:x=>x.iptal&&times[id(x)]?.iptal_ani?-at(times[id(x)].iptal_ani):Infinity}[sort]??(x=>-start(x));
 return list.sort((a,b)=>key(a)-key(b)||start(b)-start(a));
}
// Filtre seçenekleri: yalnız aktif çalışanlar. İşler ikiye ayrılır: aktif (bitmemiş, iptal edilmemiş)
// ve biten (BITTI/IPTAL ya da kullanıcının artık göremediği iş). "Biten işler" kutusu hangisinin sunulacağını seçer.
// people: [{kimlik,ad,aktif}], jobs: {kimlik:{durum,ad}} (IS ve GOREV satırları).
export const OVERTIME_JOB_CLOSED=['BITTI','IPTAL'];
export function overtimeFilterOptions(rows,{people=[],jobs={},name=k=>k}={}){
 const active=new Map(people.filter(p=>p&&p.aktif!==false).map(p=>[p.kimlik,p.ad??name(p.kimlik)]));
 const sort=m=>[...m.entries()].sort((a,b)=>String(a[1]).localeCompare(String(b[1]),'tr'));
 const kisi=new Map(),is=new Map(),biten=new Map();
 for(const x of rows){
  if(active.has(x.kisi))kisi.set(x.kisi,active.get(x.kisi));
  const h=arr0(x.hedef)[0];if(!h?.kimlik)continue;
  const j=jobs[h.kimlik],ad=j?.ad??name(h.kimlik);
  if(j&&!OVERTIME_JOB_CLOSED.includes(j.durum))is.set(h.kimlik,ad);else biten.set(h.kimlik,ad);
 }
 return {kisi:sort(kisi),is:sort(is),biten:sort(biten)};
}
const arr0=x=>Array.isArray(x)?x:[];
