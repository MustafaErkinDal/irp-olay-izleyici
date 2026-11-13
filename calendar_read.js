// Tarihli çalışma günü bilgisi motordan gelir; özel gün veya bugünün takvimi
// başka tarihlere yayılmaz. Bir formun okumaları kısa süreyle paylaşılır.
import {validDay} from './temporal.js';
const DAY=86400000,dayMs=d=>Date.parse(d+'T00:00:00Z'),dayText=n=>new Date(n).toISOString().slice(0,10);
export class CalendarReadError extends Error {}
class MissingDay extends Error {constructor(day,scope){super('Takvim bilgisi okunmalı.');this.day=day;this.scope=scope;}}
// Okunan günler aynı istemcinin bütün takvim nesnelerince paylaşılır; her nesne kendi maxAge'ini uygular.
const shared=new WeakMap();
// Hesap için okunan blok: 92 gün. Yıllık blok bulutta ~1,6 sn, 92 günlük ~0,5 sn sürer.
const BLOCK=92;
export class MotorCalendar {
 constructor(client,{maxAge=5000}={}){this.client=client;this.maxAge=maxAge;let s=shared.get(client);if(!s){s={days:new Map(),generation:client.generation};shared.set(client,s);}this.shared=s;}
 get days(){return this.shared.days;}
 key(scope){if([scope.kisi,scope.birim,scope.firma===true].filter(Boolean).length!==1)throw new CalendarReadError('Takvim için bir çalışan veya birim seçin.');return JSON.stringify([scope.kisi??null,scope.birim??null,scope.firma===true]);}
 valid(){const s=this.shared;if(this.client.generation!==s.generation){s.days.clear();s.flights?.clear();s.generation=this.client.generation;}}
 get(scope,day,at=Date.now()){this.valid();const x=this.days.get(this.key(scope))?.get(day);return x&&at-x.at<this.maxAge?x.value:null;}
 async load(scope,bas,bit){
  this.valid();this.key(scope);if(!validDay(bas)||!validDay(bit)||bas>bit)throw new CalendarReadError('Takvim tarih aralığını kontrol edin.');
  if((dayMs(bit)-dayMs(bas))/DAY>=5000)throw new CalendarReadError('Takvim tarih aralığı çok geniş. Daha kısa bir aralık seçin.');
  const generation=this.client.generation;
  for(let a=dayMs(bas),end=dayMs(bit);a<=end;a+=366*DAY){
   const b=Math.min(end,a+365*DAY),first=dayText(a),last=dayText(b);let missing=false;
   for(let n=a;n<=b;n+=DAY)if(!this.get(scope,dayText(n))){missing=true;break;}
   if(!missing)continue;
   // Aynı aralığı aynı anda isteyen hesaplar tek okumayı bekler.
   const s=this.shared,flightKey=this.key(scope)+'|'+first+'|'+last,flights=s.flights??=new Map();
   let flight=flights.get(flightKey);
   if(!flight){flight=this.client.read('WEB_KAYNAKLAR',null,{takvim_araligi:{bas:first,bit:last,...scope}},true);flights.set(flightKey,flight);const clear=()=>{if(flights.get(flightKey)===flight)flights.delete(flightKey);};flight.then(clear,clear);}
   const response=await flight,value=response?.deger?.takvim_sonucu;
   if(generation!==this.client.generation)throw new CalendarReadError('Çalışma kişisi değişti. Takvimi yeniden açın.');
   if(value?.surum!==1||value.bas!==first||value.bit!==last||(scope.kisi&&value.kisi!==scope.kisi)||(scope.birim&&value.birim!==scope.birim)||(scope.firma===true&&value.firma!==true))throw new CalendarReadError('Seçilen tarihin çalışma takvimi okunamadı. Yeniden deneyin.');
   const rows=[];
   for(let n=a;n<=b;n+=DAY){const d=dayText(n),v=value.gunler?.[d];if(v?.known!==true||typeof v.working!=='boolean'||v.working&&(!v.start||!v.end))throw new CalendarReadError('Seçilen tarihin çalışma takvimi eksik. Yeniden deneyin.');rows.push([d,{value:v,at:Date.now()}]);}
   const map=this.days.get(this.key(scope))??new Map();for(const row of rows)map.set(...row);this.days.set(this.key(scope),map);
  }
  return day=>this.get(scope,day);
 }
 work(day,unit,at=Date.now(),target=null){const scope=target??(unit?{birim:unit}:{firma:true});if(!validDay(day))throw new CalendarReadError('Takvim için geçerli tarih ve birim gerekli.');const value=this.get(scope,day,at);if(!value)throw new MissingDay(day,scope);return value.working;}
 async calculate(callback,{scope=null}={}){
  // Hesap senkron kalır; gereksinim duyduğu eksik tarih aralığı topluca alınır.
  // Birim/tarih geçmişinin karar kuralları istemciye kopyalanmaz.
  // Eksik gün için geçici olarak "çalışma günü" denip hesap sonuna kadar sürdürülür; bu turun sonucu atılır,
  // eksik bloklar birlikte okunur ve hesap yeniden yapılır. Sonuç yalnız bütün günler okunmuşken döner.
  const at=Date.now();
  for(let i=0;i<128;i++){
   const missing=new Map();let result;
   try{result=callback((day,unit)=>{try{return this.work(day,unit,at,scope);}catch(ex){if(!(ex instanceof MissingDay))throw ex;const begin=Math.floor(dayMs(ex.day)/(BLOCK*DAY))*BLOCK*DAY;missing.set(this.key(ex.scope)+begin,{scope:ex.scope,begin});return true;}});}
   catch(ex){if(!missing.size)throw ex;}
   if(!missing.size)return result;
   await Promise.all([...missing.values()].map(m=>this.load(m.scope,dayText(m.begin),dayText(m.begin+(BLOCK-1)*DAY))));
  }
  throw new CalendarReadError('Planın tarih aralığı tek işlem için çok geniş. Daha kısa aralık seçin.');
 }
}
