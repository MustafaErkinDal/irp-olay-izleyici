import {loadSharedConfig} from './erisim.js';
import {esc,time,date,table} from './ui.js';
import {OPERATIONS} from './actions.js';
import {validateConfig} from './client.js';
import {displayText} from './presentation.js';

export function eventTable(rows,newIds=new Set()){
 const text=value=>esc(displayText(value));
 return table([{label:'Geliş Zamanı',render:r=>`<strong>${time(r.ulasma??r.an)}</strong><small>${date(r.ulasma??r.an)}</small>`},{label:'Kim',render:r=>`<strong>${text(r.ad??'Çalışan')}</strong>`},{label:'İşlem',render:r=>`<strong>${text(OPERATIONS[r.eylem]?.title??'İşlem')}</strong>`},{label:'İlgili İş / Proje',render:r=>text((r.neyin_ustunde??[]).map(x=>x.etiket).filter(Boolean).join(' · ')||r.hedef_etiket||r.kisi_ad||r.girdiler?.ad||r.girdiler?.kod||'—')},{label:'Kaynak',render:r=>`<span class="source-tag">${r.cihaz?.startsWith('TEL-')?'Telefon':r.cihaz?.startsWith('MODUL-')?'Modül':'Web'}</span>`},{label:'Durum',render:r=>`<span class="badge ${r.hata?'bad':'good'}">${r.hata?'Hesap İnceleniyor':'Alındı'}</span>`}],rows,{rowClass:r=>newIds.has(r.olay)?'new-event':''});
}

// İş uygulamasının oturumundan ve kişi değişiminden bağımsız, yalnız okuyan istemci.
export class EventReader {
 constructor(call){this.call=call;this.cursor=0;this.rows=[];this.ready=false;this.newIds=new Set();}
 async read(){const result=await this.call('olay_akisi',{sonra:this.cursor,adet:500});this.newIds=new Set();if(this.ready){const old=new Set(this.rows.map(r=>r.olay));this.newIds=new Set((result.olaylar??[]).filter(r=>!old.has(r.olay)).map(r=>r.olay));const byId=new Map([...this.rows,...(result.olaylar??[])].map(r=>[r.olay,r]));this.rows=[...byId.values()].sort((a,b)=>b.sira-a.sira).slice(0,500);}this.cursor=result.son??this.cursor;this.ready=true;return this.rows;}
 clear(){this.rows=[];this.newIds=new Set();}
}

async function main(){
 let session,config,expires=0,paused=false,reader;
 const status=document.querySelector('#observer-status'),error=document.querySelector('#observer-error');
 const showStatus=(text,online)=>{status.innerHTML=`<span class="status-dot ${online?'':'offline'}"></span>${esc(text)}`;document.querySelector('#connection-label').textContent=text;};
 async function request(path,body,auth=true){
  const response=await fetch(config.supabase_url+path,{method:'POST',headers:{apikey:config.supabase_anon,'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+session.access_token}:{})},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(response.status===401)expires=0;
  if(!response.ok)throw new Error('Bağlantı kurulamadı. Yerel ayarı ve olay akışı yetkisini kontrol edin.');return response.json();
 }
 async function bulutGiris(kisi,pin){const response=await fetch('/bulut/giris',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kisi,pin}),cache:'no-store'});if(!response.ok)throw new Error('Giriş yapılamadı.');return response.json();}
 async function login(){
  // GitHub sunum kopyası: girişsiz, salt okunur akış (olay_akisi_acik).
  if(config.acik_izleyici){expires=Infinity;return;}
  if(config.t32_cloud||config.yerel_test){
   if(session?.refresh_token){try{session=await request('/auth/v1/token?grant_type=refresh_token',{refresh_token:session.refresh_token},false);expires=Date.now()+(session.expires_in??3600)*1000;return;}catch{session=null;}}
   await new Promise(resolve=>{
    const dialog=document.createElement('dialog');dialog.setAttribute('aria-label','Olay Ekranına Giriş');dialog.innerHTML='<form class="stack" style="min-width:280px;padding:24px"><h2>Olay Ekranına Giriş</h2><p>Olayları görme yetkisi olan hesabınızla devam edin.</p><label class="field"><span>E-posta</span><input name="email" type="email" autocomplete="username" required></label><label class="field"><span>Şifre</span><input name="password" type="password" autocomplete="current-password" required></label><p class="form-error" role="alert"></p><button class="btn primary" type="submit">Giriş Yap</button><a href="index.html">Çalışma Alanına Dön</a></form>';
    document.body.append(dialog);dialog.addEventListener('cancel',e=>e.preventDefault());dialog.showModal();
    if(config.yerel_test||config.bulut_giris){dialog.querySelector('p').textContent='Ekip girişi';const e=dialog.querySelector('[name=email]');e.type='text';e.value='K001';e.previousElementSibling.textContent='Kişi kodu';const p=dialog.querySelector('[name=password]');p.previousElementSibling.textContent='PIN (4 hane)';p.inputMode='numeric';p.maxLength=4;p.minLength=4;}
    dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();const form=event.target,button=form.querySelector('button');button.disabled=true;try{session=config.bulut_giris?await bulutGiris(form.email.value.trim().toUpperCase(),form.password.value):config.yerel_test?await request('/yerel/profil',{kisi:form.email.value.trim().toUpperCase(),pin:form.password.value},false):await request('/auth/v1/token?grant_type=password',{email:form.email.value.trim().toLowerCase(),password:form.password.value},false);form.password.value='';expires=Date.now()+(session.expires_in??3600)*1000;dialog.close();dialog.remove();resolve();}catch{form.querySelector('.form-error').textContent=config.yerel_test||config.bulut_giris?'Giriş yapılamadı. Kişi kodunu ve PIN’i kontrol edin.':'Giriş yapılamadı. E-posta adresinizi ve şifrenizi kontrol edin.';button.disabled=false;}};
   });return;
  }
  const account=config.gosteri_kisileri?.find(p=>p.kod==='K001');if(!account)throw new Error('Olay izleyicisi için CEO gösteri hesabı gerekli.');session=await request('/auth/v1/token?grant_type=password',{email:'k001@calisan.irp',password:account.sifre},false);expires=Date.now()+(session.expires_in??3600)*1000;
 }
 function render(){const rows=reader.rows;if(reader.newIds.size){const counter=document.querySelector('#event-count');counter.classList.remove('event-count-flash');void counter.offsetWidth;counter.classList.add('event-count-flash');counter.setAttribute('aria-label',reader.newIds.size+' yeni olay geldi');}document.querySelector('#event-count').textContent=String(rows.length);document.querySelector('#last-event-time').textContent=rows.length?time(rows[0].ulasma??rows[0].an):'—';if(!rows.length){document.querySelector('#event-rows').innerHTML='<div class="empty"><div class="empty-symbol">↧</div><strong>Yeni Olaylar Bekleniyor</strong><p>Telefon veya webden bir işlem yapıldığında burada görünecek.</p></div>';return;}
  document.querySelector('#event-rows').innerHTML=eventTable(rows,reader.newIds);
 }
 async function poll(){try{if(!paused){if(Date.now()>expires-60000)await login();await reader.read();render();error.textContent='';showStatus('Canlı Bağlantı',true);}}catch(e){showStatus('Yeniden Bağlanıyor',false);error.textContent=e.message;}finally{setTimeout(poll,1500);}}
 async function connect(){try{config=validateConfig(await loadSharedConfig());await login();reader=new EventReader((name,g)=>config.acik_izleyici?request('/rest/v1/rpc/olay_akisi_acik',g,false):request('/rest/v1/rpc/'+name,g));await reader.read();showStatus('Canlı Bağlantı',true);void poll();}catch(e){showStatus('Yeniden Bağlanıyor',false);error.textContent=e.message;setTimeout(connect,3000);}}
 void connect();
 document.querySelector('#pause-events').onclick=e=>{paused=!paused;e.target.textContent=paused?'Akışı Sürdür':'Akışı Duraklat';if(paused)showStatus('Duraklatıldı',false);};document.querySelector('#clear-events').onclick=()=>{if(reader){reader.clear();render();}};
}
if(typeof document!=='undefined')void main();
