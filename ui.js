import {displayText,formatVisible} from './presentation.js';

export const esc = (x='') => String(x ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const idOf = x => x?.kimlik ?? x?.kod ?? x?.satir ?? '';
export const titleCase = value => String(value??'').replace(/(^|[\s(/])(\p{L})/gu,(_,space,letter)=>space+letter.toLocaleUpperCase('tr-TR')).replace(/(\s)(Ve|Veya|İle)(?=\s)/gu,(_,space,word)=>space+word.toLocaleLowerCase('tr-TR'));
export function headingCase(root){formatVisible(root);root?.querySelectorAll('h1,h2,h3,legend,.advanced-fields>summary,.field>span,.checkbox-field>span,.detail-list dt,.nav-link>span:last-child,.nav-label,.page-eyebrow,.eyebrow,.topbar-breadcrumb strong,.tab').forEach(el=>{if(el.children.length===0)el.textContent=titleCase(el.textContent);});}
export function installUiBehavior(){
 if(document.documentElement.dataset.uiBehavior)return;document.documentElement.dataset.uiBehavior='true';
 const setOpen=(menu,open)=>{menu.classList.toggle('is-open',open);menu.querySelector('[data-menu-toggle]')?.setAttribute('aria-expanded',String(open));const list=menu.querySelector('.menu-items');if(list)list.hidden=!open;};
 const closeOthers=except=>document.querySelectorAll('.overflow-menu.is-open').forEach(menu=>{if(menu!==except)setOpen(menu,false);});
 document.addEventListener('pointerdown',e=>closeOthers(e.target.closest?.('.overflow-menu')),true);
 document.addEventListener('click',e=>{const button=e.target.closest?.('[data-menu-toggle]');if(button){e.preventDefault();const menu=button.closest('.overflow-menu'),open=!menu.classList.contains('is-open');closeOthers(menu);setOpen(menu,open);}else closeOthers(null);},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeOthers(null);});
 document.addEventListener('change',e=>{if(e.target.matches?.('input[type=date]'))e.target.blur();});
}
export const arr = x => Array.isArray(x) ? x : x && typeof x === 'object' ? Object.entries(x).map(([kimlik,v])=>typeof v==='object'&&v!==null?{kimlik,...v}:{kimlik,deger:v}) : [];
export const num = (n, digits=1) => n==null || !Number.isFinite(Number(n)) ? '—' : Number(n).toLocaleString('tr-TR',{maximumFractionDigits:digits});
export const money = n => n==null || n==='VERI_EKSIK' ? 'Bilgi eksik' : `${num(n,2)} ₺`;
export const hours = n => n==null ? '—' : `${num(n)} sa`;
export const date = x => !x ? '—' : new Date(String(x).length===10?x+'T12:00:00+03:00':x).toLocaleDateString('tr-TR',{day:'2-digit',month:'short',year:'numeric',timeZone:'Europe/Istanbul'});
export const time = x => !x ? '—' : new Date(x).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Istanbul'});
export const isoDay = (d=new Date()) => new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul'}).format(d);
export function period(day=isoDay()) {const [y,m]=day.split('-').map(Number);return {bas:`${y}-${String(m).padStart(2,'0')}-01`,bit:`${y}-${String(m).padStart(2,'0')}-${new Date(y,m,0).getDate()}`};}
export function label(x) { return ({BB:'Bitince başlar (BB)',BS:'Başlayınca başlar (BŞ)',BASLAT:'Tezgâhı başlatır',AL:'Tezgâhtan alır',ZAMAN:'Teslim ve zaman değeri',SAAT:'Saat ile ölçülen atölye işi',GENEL_GIDER_PAYI:'Genel gider payı',MAAS_AYLIK:'Aylık maaş',SAAT_UCRETI:'Tezgâh saat bedeli',ACIK:'Açık',ATANDI:'Atandı',KABUL_BEKLIYOR:'Kabul bekliyor',KABUL_EDILDI:'Kabul edildi',BITTI:'Tamamlandı',TAMAMLANDI:'Tamamlandı',ONAY_BEKLIYOR:'Onay bekliyor',RED:'Reddedildi',REDDEDILDI:'Düzeltme bekliyor',REVIZYONDA:'Revizyonda',IPTAL:'İptal',CALISIYOR:'Çalışıyor',BOS:'Boşta',MESAI_DISI:'Mesai dışında',MOLADA:'Molada',SABIT_MOLADA:'Sabit mola',DEVAM_BEKLIYOR:'Devam bekliyor',ARIZA_BEKLIYOR:'Duruşta',ARIZADA:'Duruşta',CALISMIYOR:'Çalışmıyor',CALISILIYOR:'Çalışıyor',HAVUZDA:'Havuzda',SIRADA:'Sırada',YARIM:'Yarım Kaldı',BEKLEME:'Bekleme',ON_IS_BEKLIYOR:'Ön iş bekliyor',SURUYOR:'Sürüyor',KAPALI:'Kapalı',GECIKTI:'Gecikti',SIPARIS_VERILMELI:'Sipariş verilmeli',SIPARISTE:'Siparişte',GELDI:'Geldi',ISLEMDE:'İşlemde',FASONDA:'Fasonda',KALITE_ONAYLI:'Kalite onaylı',MONTAJA_HAZIR:'Montaja hazır',MONTAJDA:'Montajda',TASLAK:'Taslak',ONAYLI:'Onaylı',GERI_CEKILDI:'Geri çekildi',NORMAL:'Normal',YUKSEK:'Yüksek',ACIL:'Acil',MAVI:'Atölye',BEYAZ:'Ofis',GUNCEL:'Güncel',BEKLIYOR:'Bekliyor',GONDERILEMEDI:'Gönderilemedi',GONDERILDI:'Gönderildi',HATA:'İnceleme gerekli',YETKILI:'Yetkili',YONETICI:'Yönetici',EKIP_LIDERI:'Ekip lideri',BEYAZ_YAKA:'Ofis Çalışanı',CALISAN:'Çalışan',MALIYET:'Maliyet',IK:'İnsan kaynakları',PROJE:'Proje',PROJE_DISI:'Proje dışı',KISI:'Kişi',BIRIM:'Birim',TEZGAH:'Tezgâh',NESNE:'Nesne',GOREV:'Görev',IS:'İş',SURELI:'Süreli',ANLIK:'Anlık',TATIL:'Tatil',YARIM_GUN:'Yarım gün',OZEL_MESAI:'Özel mesai',ONAYLANDI:'Onaylandı',ONAY_GEREKMIYOR:'Gün Onayı Gerekmiyor',DEGISTI:'Güncellendi',IADE:'Düzeltme Bekliyor',ONAY:'Onayla',DEGISTIR:'Değiştir',KALDIR:'Kaldır',KABUL:'Kabul',RET:'Ret',FIRMA:'Firma',MUSTERI:'Müşteri isteği',HATA:'Hata',IYILESTIRME:'İyileştirme'})[x] ?? String(x ?? '—').replaceAll('_',' '); }
export function badge(x) {const good=['BITTI','TAMAMLANDI','ONAYLI','GUNCEL','GONDERILDI','CALISIYOR','CALISILIYOR'];const warn=['ONAY_BEKLIYOR','BEKLIYOR','REVIZYONDA','SIPARIS_VERILMELI','MOLADA','SABIT_MOLADA','ON_IS_BEKLIYOR'];const bad=['GECIKTI','RED','REDDEDILDI','IPTAL','HATA','ARIZADA','ARIZA_BEKLIYOR'];return `<span class="badge ${good.includes(x)?'good':warn.includes(x)?'warn':bad.includes(x)?'bad':x==='MESAI_DISI'?'offshift':''}">${esc(label(x))}</span>`;}
// Bütçe tüketimi: %90 ve üstü uyarı, %100'ün üstü hata; değer yoksa —. Durum renkle birlikte metinle de anlatılır.
export function budget(v) {if(typeof v!=='number'||!Number.isFinite(v))return '—';const tone=v>100?'t6-bad':v>=90?'t6-warn':'';return `<span class="${tone}"${v>100?' title="Bütçe aşıldı"':''}>${esc(num(v))}%</span>`;}
export function button(text, action, data={}, type='secondary') {return `<button type="button" class="btn ${type}" data-action="${esc(action)}" ${Object.entries(data).map(([k,v])=>`data-${k}="${esc(v)}"`).join(' ')}>${esc(text)}</button>`;}
export const empty = (title='Gösterilecek nesne yok', detail='Seçili kapsamda henüz bir işlem bulunmuyor.') => `<div class="empty"><span class="empty-symbol">≡</span><strong>${esc(title)}</strong><p>${esc(detail)}</p></div>`;
export const errorBox = e => `<div class="notice bad" role="alert">${esc(e?.message??e)}</div>`;
export function panel(title,body,actions='') {return `<section class="panel"><header class="panel-head"><h2>${esc(title)}</h2><div class="toolbar">${actions}</div></header>${body}</section>`;}
export function table(columns,rows,{key='kimlik',select=false,kind='',selected='',compact=false,rowClass=()=>''}={}) {
 if(!rows?.length) return empty();
 return `<div class="table-scroll"><table class="data-table ${compact?'compact':''}"><thead><tr>${select?'<th class="check-col"></th>':''}${columns.map(c=>`<th class="${esc(c.className??'')} ${c.numeric?'numeric':''}">${c.head??esc(titleCase(c.label))}</th>`).join('')}</tr></thead><tbody>${rows.map((r,i)=>{
 const id = typeof key==='function'?key(r):r[key]??idOf(r)??i;
 return `<tr data-kind="${esc(kind)}" data-id="${esc(id)}" ${select?'data-action="select-row" tabindex="0"':''} class="${select&&selected!==''&&id===selected?'selected':''} ${esc(rowClass(r))}">${select?`<td><input type="radio" name="selected-${esc(kind)}" aria-label="Satırı seç" ${id===selected&&selected!==''?'checked':''}></td>`:''}${columns.map(c=>`<td class="${esc(c.className??'')} ${c.numeric?'numeric':''}">${c.render?c.render(r):esc(typeof c.key==='function'?c.key(r):r[c.key])}</td>`).join('')}</tr>`;
 }).join('')}</tbody></table></div>`;
}
export function details(record, fields) {return `<dl class="detail-list">${fields.map(([k,l,render])=>`<div><dt>${esc(l)}</dt><dd>${render?render(record[k]):esc(record[k]??'—')}</dd></div>`).join('')}</dl>`;}
// Mesajlar sağ üstte alt alta durur; kapatmak yalnız mesajı kaldırır, okunmuşluk değildir.
function toastBox(kind,body,duration){
 const host=document.querySelector('#toasts');if(!host)return null;
 const el=document.createElement('div');el.className='toast '+kind;el.setAttribute('role',kind==='bad'?'alert':'status');
 el.innerHTML=`<div class="toast-body">${body}</div><button type="button" class="toast-close" aria-label="Mesajı kapat">×</button>`;
 el.querySelector('.toast-close').onclick=()=>el.remove();
 host.prepend(el);while(host.children.length>5)host.lastElementChild.remove();
 if(duration)setTimeout(()=>el.remove(),duration);return el;
}
export function toast(message, bad=false) {return toastBox(bad==='info'?'info':bad?'bad':'good',esc(displayText(message)),bad===true?9000:bad?6500:4500);}
export function notify(title,text,{action='',onAction}={}) {
 const el=toastBox('notice',`<span class="toast-kind">Yeni Bildirim</span><strong>${esc(displayText(title))}</strong>${text?`<p>${esc(displayText(text))}</p>`:''}${action?`<button type="button" class="btn small" data-toast-action>${esc(action)}</button>`:''}`,12000);
 el?.querySelector('[data-toast-action]')?.addEventListener('click',()=>{el.remove();onAction?.();});return el;
}
export function modal(title, body, {wide=false,footer='',onClose}={}) {
 const d=document.createElement('dialog');d.className='modal'+(wide?' wide':'');
 d.innerHTML=`<header class="dialog-head"><h2>${esc(title)}</h2><button class="icon-button" type="button" data-close aria-label="Kapat">×</button></header><div class="dialog-body">${body}</div>${footer?`<footer class="dialog-footer">${footer}</footer>`:''}`;
 const dismissible=()=>!d.querySelector('[data-close]').disabled;
 const outside=e=>{const r=d.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;};
 let startedOutside=false;
 d.addEventListener('pointerdown',e=>{startedOutside=e.target===d&&outside(e);});
 // Doğrulama metni küçülünce pencere yeniden ortalanabilir. Gönder'e
 // çift tıklamanın ikinci tıklaması perdeye düşerse taslağı kapatma.
 d.addEventListener('click',e=>{if(e.detail<=1&&startedOutside&&e.target===d&&outside(e)&&dismissible())d.close();startedOutside=false;});
 d.addEventListener('cancel',e=>{if(!dismissible())e.preventDefault();});
 d.querySelector('[data-close]').onclick=()=>{if(dismissible())d.close();};d.addEventListener('close',()=>{onClose?.();d.remove();});headingCase(d);document.querySelector('#dialogs').append(d);d.showModal();return d;
}
export function downloadCSV(name, columns, rows) {
 const cell=x=>'"'+String(x??'').replaceAll('"','""').replace(/^[=+@-]/,'\t$&')+'"';
 const csv='\ufeff'+[columns.map(c=>cell(c.label)).join(';'),...rows.map(r=>columns.map(c=>cell(typeof c.key==='function'?c.key(r):r[c.key])).join(';'))].join('\r\n');
 const u=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download=name+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
}
// Onay penceresi: Vazgeç veya onay düğmesi; sonuç true/false döner.
export function askConfirm(title,message,{ok='Onayla',danger=false}={}){
 return new Promise(resolve=>{
  let done=false;const finish=v=>{if(done)return;done=true;resolve(v);};
  const d=modal(title,`<p class="confirm-text">${esc(message)}</p>`,{footer:`<button type="button" class="btn" data-confirm-no>Vazgeç</button><button type="button" class="btn ${danger?'danger':'primary'}" data-confirm-yes>${esc(ok)}</button>`,onClose:()=>finish(false)});
  d.querySelector('[data-confirm-no]').onclick=()=>{finish(false);d.close();};
  d.querySelector('[data-confirm-yes]').onclick=()=>{finish(true);d.close();};
  d.addEventListener('close',()=>finish(false));
 });
}

// Kesin ret ile teslim edilmiş, sonucu beklenen işlem ayrı anlatılır.
export function formMessageTone(element,error){
 if(!element)return;const pending=error?.code==='PENDING';
 element.classList.toggle('pending',pending);element.setAttribute('role',pending?'status':'alert');
}
