// Proje şablonundan etap taslağı. Kaynak: "Sibernetik Navigation · Görev Şablonları",
// Bölüm 8 (Standart Makine Projesi). Şablon motorda tutulmadığı için ekranda sabittir
// (motor eksiği 15). Ana aşama, bağımlılık ve kilometre taşları yalnız tarih hesabı ve
// bilgi içindir; motora ETAP.TANIMLADIM'ın standart alanları gider.
import {idOf,arr} from './ui.js';
import {validDay,nextDay} from './temporal.js';
import {calendarDay,isoWeekday} from './time_model.js';

const row=(no,ad,ana_asama,birimler,bagimlilik,is_paketi,kural)=>({no,ad,ana_asama,birimler,bagimlilik,is_paketi,kural});
const dep=(no,tur,not='')=>({no,tur,not});

export const STAGE_TEMPLATES=Object.freeze([{
 kod:'SMP',ad:'Standart Makine Projesi',surum:1,
 aciklama:'Sipariş aşamasına geçen makine projesinin ana etapları. Uygun etaplar paralel yürür; bir etap başka bir etabın bitmesine bağlıysa bağımlılığı tanımlıdır.',
 satirlar:[
  row(1,'Sipariş, proje kaydı ve devir','Planlama',['Proje Yönetimi'],null,'PY-01','K-0588'),
  row(2,'Muhasebe ve finans devri','Planlama',['Muhasebe ve Finans'],dep(1,'BS'),'MF-01','K-0506, K-0499'),
  row(3,'Mekanik tasarım','Tasarım',['Mekanik Tasarım'],dep(1,'BB'),'MT-01','K-0137, K-0599'),
  row(4,'Otomasyon tasarımı','Tasarım',['Otomasyon Tasarım'],dep(3,'BS','eş zamanlı'),'OT-01','K-0727'),
  row(5,'Planlama ve satın alma','İmalat/Satın Alma',['Planlama','Satın Alma'],dep(3,'BS','erken satın alma'),'PS-01','K-0649, K-0653'),
  row(6,'İmalat','İmalat/Satın Alma',['İmalat'],dep(5,'BS'),'Rota şablonları','K-0137, K-1331'),
  row(7,'Mekatronik montaj ve entegrasyon','Montaj',['Mekatronik Montaj'],dep(6,'BS'),'MM-01 (1–5)','K-0832, K-0834'),
  row(8,'İç doğrulama ve FAT','Montaj',['Mekatronik Montaj','Kalite'],dep(7,'BB'),'MM-01 (6–8)','K-0846'),
  row(9,'Sevkiyat, kurulum ve devreye alma','Devreye Alma',['Kurulum ve Devreye Alma'],dep(8,'BB'),'KD-01 (1–7)','K-0888'),
  row(10,'Eğitim, teslim dosyası ve kesin kabul','Kurulum/Teslim',['Kurulum ve Devreye Alma'],dep(9,'BB'),'KD-01 (8–10)','K-0903, K-0905'),
 ],
 kilometre_taslari:[
  {ad:'Müşteri tasarım onayı',etaplar:[3],onaylayan:'Müşteri',kural:'K-0611, K-0615'},
  {ad:'Tasarımın satın alma ve imalata devri',etaplar:[3,4],onaylayan:'Proje, tasarım ve otomasyon ekip liderleri',kural:'K-0647'},
  {ad:'Fabrika kabul testi (FAT)',etaplar:[8],onaylayan:'Müşteri',kural:'K-0846'},
  {ad:'Sevk öncesi ön kabul',etaplar:[8],onaylayan:'Müşteri',kural:'K-0550'},
  {ad:'Saha kabul testi (SAT)',etaplar:[9],onaylayan:'Müşteri',kural:'K-0894'},
  {ad:'Kesin kabul',etaplar:[10],onaylayan:'Müşteri ve yetkili yönetici',kural:'K-0846'},
 ],
}]);

export const templateByCode=kod=>STAGE_TEMPLATES.find(t=>t.kod===kod)??null;
export const dependencyText=d=>d?`${d.no} ${d.tur==='BS'?'BŞ':'BB'}`:'—';
export const dependencyTitle=d=>!d?'Bağımsız':d.tur==='BS'?`${d.no}. etap başlayınca başlar${d.not?' ('+d.not+')':''}`:`${d.no}. etap bitince başlar`;
// Şablon satırında öncül seçilebilecek etaplar: yalnız daha önceki satırlar (sıra korunur, döngü oluşmaz).
export const dependencyChoices=(rows,r)=>arr(rows).filter(x=>x.no<r.no);
// Kullanıcının seçtiği bağımlılık. no boşsa bağımsız. Öncül değişince şablon notu düşer.
export function withDependency(r,no,tur){
 const n=Number(no);
 if(!no||!Number.isInteger(n)||n<1||n>=r.no)return {...r,bagimlilik:null};
 const kind=tur==='BS'?'BS':tur==='BB'?'BB':(r.bagimlilik?.tur??'BB');
 return {...r,bagimlilik:{no:n,tur:kind,not:r.bagimlilik?.no===n?r.bagimlilik.not??'':''}};
}
export const phaseLabel=x=>String(x??'').replace(/\s*\/\s*/g,' / ');

// Ad karşılaştırması: Türkçe harfler katlanır, boşluk/noktalama yok sayılır.
// Böylece "İmalat" adı da IMALAT kodu da aynı anahtara iner.
export function foldName(value){
 const map={ı:'i',İ:'i',I:'i',ş:'s',Ş:'s',ğ:'g',Ğ:'g',ü:'u',Ü:'u',ö:'o',Ö:'o',ç:'c',Ç:'c',â:'a',Â:'a',î:'i',Î:'i',û:'u',Û:'u'};
 return String(value??'').replace(/[ıİIşŞğĞüÜöÖçÇâÂîÎûÛ]/g,c=>map[c]).toLowerCase().replace(/[^a-z0-9]/g,'');
}

// Önce bu tarayıcıda hatırlanan seçim (birim hâlâ varsa), sonra şablondaki adlarla birim adı,
// en son birim kodu. Bulunamazsa boş döner; kullanıcı seçmeden etap eklenmez.
export function matchUnit(names,units,remembered=''){
 const list=arr(units);
 if(remembered&&list.some(u=>idOf(u)===remembered))return remembered;
 for(const key of ['ad','kod'])for(const name of arr(names)){
  const want=foldName(name);if(!want)continue;
  const hit=list.find(u=>foldName(key==='kod'?idOf(u):u.ad)===want);
  if(hit)return idOf(hit);
 }
 return '';
}

// Etap sorumlusu motorun aday listesinden seçilir (forms.js'deki Etap Ekle kuralıyla aynı).
export function defaultResponsible(unit,project,candidates,person){
 const allowed=arr(candidates);
 for(const id of [unit?.basi,project?.sorumlu,person])if(id&&allowed.includes(id))return id;
 return allowed.includes(person)?person:(allowed[0]??'');
}

// Çalışma günü: tatil/özel gün, birim takvimi, firma takvimi. Bilinmiyorsa Pazartesi–Cuma.
export function workdayFn(resources,units){
 const byId=new Map(arr(units).map(u=>[idOf(u),u]));
 return (day,unit)=>{
  const known=calendarDay(resources,byId.get(unit)??null,day);
  if(known)return known.working;
  const base=byId.get(unit)?.takvim??resources?.takvim;
  const days=arr(base?.calisma_gunleri);
  return (days.length?days:[1,2,3,4,5]).includes(isoWeekday(day));
 };
}
export function firstWorkday(day,isWork,unit){
 let d=day;for(let i=0;i<400&&!isWork(d,unit);i++)d=nextDay(d);return d;
}
// Başlangıç dahil "count" çalışma günü sonra biten gün.
export function addWorkdays(start,count,isWork,unit){
 let d=start,left=count-1;for(let i=0;i<5000&&left>0;i++){d=nextDay(d);if(isWork(d,unit))left--;}return d;
}
export const validDuration=v=>v!==''&&v!=null&&Number.isInteger(Number(v))&&Number(v)>=1&&Number(v)<=2000;
export const validHours=v=>v!==''&&v!=null&&Number.isInteger(Number(v))&&Number(v)>=0;

// Satırları şablon sırasıyla hesaplar. Bağımlılıklar her zaman önceki satırlara gider.
// Elle tarih verilmiş satır korunur. Seçilmemiş satır sıfır uzunlukta geçilir: ona BB ile
// bağlı etap, onun başlayacağı gün başlar. Süre boşsa bitiş (ve ona BB bağlı etaplar) boş kalır.
export function scheduleRows(rows,planStart,isWork,{requireUnit=false}={}){
 const done=new Map();
 return rows.map(r=>{
  const p=r.bagimlilik?done.get(r.bagimlilik.no):null;
  let base=null;
  if(!r.bagimlilik)base=validDay(planStart)?planStart:null;
  // BB yalnız öncülün bitişine bakar: başlangıcı hesaplanamayan öncülün elle girilen bitişi de yeter.
  else if(p)base=r.bagimlilik.tur==='BS'||p.zero?p.start:p.end;
  if(base)for(let n=0;n<Math.max(0,Number(r.bagimlilik?.gun)||0);n++)base=firstWorkday(nextDay(base),isWork,r.birim);
  const out={...r};
  // Eklenmiş, projede zaten var olan (seçilmemiş) ya da elle tarihlenmiş seçili satır: tarihleri sabit,
  // bağlılar onlara göre hesaplanır.
  if(r.eklendi||r.mevcut&&!r.secili||r.secili&&r.elle&&r.baslangic_elle===undefined){
   const start=validDay(r.baslangic)?r.baslangic:null,end=start&&validDay(r.bitis)&&r.bitis>=start?r.bitis:null;
   done.set(r.no,{start,end});return out;
  }
  const start=r.baslangic_elle?(validDay(r.baslangic)?r.baslangic:null):base&&(!requireUnit||r.birim)?firstWorkday(base,isWork,r.birim):null;
  const end=r.bitis_elle?(validDay(r.bitis)?r.bitis:null):start&&validDuration(r.sure)?addWorkdays(start,Number(r.sure),isWork,r.birim):null;
  // Seçilmemiş satır da önizleme için hesaplanır ama bağlı etapları bekletmez.
  if(!r.baslangic_elle)out.baslangic=start??'';if(!r.bitis_elle)out.bitis=end??'';
  done.set(r.no,r.secili?{start,end}:{start,end:null,zero:true});
  return out;
 });
}

const sameName=(a,b)=>String(a??'').trim().toLocaleLowerCase('tr-TR')===String(b??'').trim().toLocaleLowerCase('tr-TR');
export const nameTaken=(name,existing)=>arr(existing).some(e=>sameName(e.ad,name));

// Gönderilecek satırların hataları. Alan adları tablo hücreleriyle aynıdır.
export function templateIssues(rows,{candidates=[],existing=[],units=null,planStart}={}){
 const issues=[],add=(no,alan,mesaj)=>issues.push({no,alan,mesaj});
 const pending=rows.filter(r=>r.secili&&!r.eklendi);
 if(planStart!==undefined&&!validDay(planStart))add(null,'plan_baslangic','Plan başlangıcını GG.AA.YYYY biçiminde yazın.');
 if(!pending.length){add(null,'','Eklemek için en az bir etap seçin.');return issues;}
 const allowed=arr(candidates);
 for(const r of pending){
  const name=String(r.ad??'').trim();
  if(!name)add(r.no,'ad','Etap adını yazın.');
  else if(nameTaken(name,existing))add(r.no,'ad','Bu adla bir etap projede zaten var. Adı değiştirin veya satırı seçmeyin.');
  else if(pending.some(x=>x!==r&&sameName(x.ad,name)))add(r.no,'ad','Bu ad başka bir seçili satırda da var.');
  if(!r.birim)add(r.no,'birim','Birimi seçin.');
  else if(units&&!arr(units).some(u=>idOf(u)===r.birim))add(r.no,'birim','Bu birim artık yok. Başka birim seçin.');
  if(!r.sorumlu)add(r.no,'sorumlu','Etap sorumlusunu seçin.');
  else if(allowed.length&&!allowed.includes(r.sorumlu))add(r.no,'sorumlu','Bu kişi etap sorumlusu olamaz.');
  if(!r.elle&&!validDuration(r.sure))add(r.no,'sure','Süreyi 1 veya daha fazla iş günü olarak yazın.');
  // Hesaplanamayan başlangıç çoğunlukla önceki bir etabın eksik süresinden gelir; nedeni zaten
  // işaretliyse bağlı her satırda ayrıca yazılmaz (yine de gönderim engellenir).
  const upstream=planStart!==undefined&&!validDay(planStart)||issues.some(i=>i.no!=null&&i.no<r.no&&['sure','baslangic','bitis'].includes(i.alan));
  if(!validDay(r.baslangic)&&(r.elle||!upstream))add(r.no,'baslangic',r.elle?'Geçerli bir tarih girin (GG.AA.YYYY).':'Başlangıç hesaplanamadı. Bağlı olduğu etabın süresini veya tarihlerini tamamlayın.');
  if(!validDay(r.bitis)){if(r.elle||validDuration(r.sure))add(r.no,'bitis',r.elle?'Geçerli bir tarih girin (GG.AA.YYYY).':'Bitiş hesaplanamadı.');}
  else if(validDay(r.baslangic)&&r.bitis<r.baslangic)add(r.no,'bitis','Bitiş tarihi başlangıçtan önce olamaz.');
  if(!validHours(r.hedef_saat))add(r.no,'hedef_saat','Hedef emeği 0 veya daha büyük tam sayı olarak yazın.');
 }
 return issues;
}

// Engellemeyen uyarılar: satır numarasına göre metin.
export function templateWarnings(rows,project){
 const out=new Map(),due=String(project?.teslim_tarihi??'').slice(0,10);
 for(const r of rows)if(r.secili&&!r.eklendi&&validDay(due)&&validDay(r.bitis)&&r.bitis>due)out.set(r.no,'Proje tesliminden sonra bitiyor.');
 return out;
}

// ETAP.TANIMLADIM yükü. Standart alanlara ek olarak (motor kayda saklar, motor eksiği 16):
// bagimliliklar — öncül etap eklenmiş veya projede aynı adla varsa onun kimliğiyle;
// ana_asama, sablon {kod,surum,no}; kilometre_taslari — taşın bağlı olduğu son etaba yazılır.
// ids: şablon satır no → etap kimliği.
export function stagePayload(r,projectId,{ids=new Map(),template=null}={}){
 const out={proje:projectId,ad:String(r.ad).trim(),birim:r.birim,sorumlu:r.sorumlu||null,baslangic:r.baslangic,bitis:r.bitis,hedef_saat:Number(r.hedef_saat)};
 if(!template)return out;
 const pred=r.bagimlilik?ids.get(r.bagimlilik.no):null;
 out.bagimliliklar=pred?[{etap:pred,tur:r.bagimlilik.tur,gun:0}]:[];
 if(r.ana_asama)out.ana_asama=r.ana_asama;
 out.sablon={kod:template.kod,surum:template.surum,no:r.no};
 // Şablondaki onaylayan bir rol/kişi tarifi ("Müşteri" gibi) metnidir; motor `onaylayan` alanında etkin kişi
 // kodu bekler (080_t29_proje_etap_kapi). Tarif `onaylayan_metni` olarak gider; onayı projede yetkili kişi verir.
 const ms=arr(template.kilometre_taslari).filter(m=>Math.max(...arr(m.etaplar))===r.no).map(m=>({ad:m.ad,...(m.onaylayan?{onaylayan_metni:m.onaylayan}:{})}));
 if(ms.length)out.kilometre_taslari=ms;
 return out;
}
// Şablon satırı no → etap kimliği: bu pencerede eklenenler ve projede aynı adla olanlar.
export function templateStageIds(rows,existing=[]){
 const ids=new Map();
 for(const r of rows){
  if(r.kimlik){ids.set(r.no,r.kimlik);continue;}
  const hit=arr(existing).find(e=>sameName(e.ad,r.ad));if(hit)ids.set(r.no,idOf(hit));
 }
 return ids;
}

// Şablon satırlarından düzenlenebilir taslak. remembered: {satirlar:{[no]:{birim,sure}}}.
export function draftRows(template,{units=[],project=null,candidates=[],person='',existing=[],remembered={}}={}){
 const byId=new Map(arr(units).map(u=>[idOf(u),u]));
 return template.satirlar.map(t=>{
  const memo=remembered?.satirlar?.[t.no]??{};
  const birim=matchUnit(t.birimler,units,memo.birim);
  const present=nameTaken(t.ad,existing),hit=present?arr(existing).find(e=>sameName(e.ad,t.ad)):null;
  return {no:t.no,ad:t.ad,ana_asama:t.ana_asama,sablon_birim:t.birimler.join(', '),bagimlilik:t.bagimlilik,is_paketi:t.is_paketi,kural:t.kural,
   birim,sorumlu:defaultResponsible(byId.get(birim),project,candidates,person),sorumlu_elle:false,
   sure:validDuration(memo.sure)?String(memo.sure):'',hedef_saat:'0',baslangic:String(hit?.baslangic??'').slice(0,10),bitis:String(hit?.bitis??'').slice(0,10),elle:false,
   secili:!present,mevcut:present,eklendi:false,durum:''};
 });
}

// Tarayıcıda hatırlanacak tercihler: yalnız gönderilen satırların süresi ve birimi.
export function rememberedFrom(rows,previous={}){
 const satirlar={...(previous?.satirlar??{})};
 for(const r of rows)if(r.secili){const x={...(satirlar[r.no]??{})};if(r.birim)x.birim=r.birim;if(validDuration(r.sure))x.sure=Number(r.sure);satirlar[r.no]=x;}
 return {surum:1,satirlar};
}

// Ana aşamaya göre sıralı gruplar (şablon sırası korunur).
export function phaseGroups(rows){
 const groups=[];for(const r of rows){let g=groups.find(x=>x.ad===r.ana_asama);if(!g)groups.push(g={ad:r.ana_asama,satirlar:[]});g.satirlar.push(r);}return groups;
}
