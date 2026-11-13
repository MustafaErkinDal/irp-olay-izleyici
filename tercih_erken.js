/* İlk boyamadan önce tema ve yoğunluk tercihini uygular (beyaz parlamayı önler).
   Güvenlik politikası satır içi betiğe izin vermediği için ayrı, eşzamanlı yüklenen dosyadır.
   Tercihlerin asıl yönetimi tercihler.js'tedir; anahtarlar aynıdır. */
(function(){
 var d=document.documentElement,t='light',y='compact';
 try{if(localStorage.getItem('irp.tema')==='dark')t='dark';if(localStorage.getItem('irp.yogunluk')==='comfy')y='comfy';}catch(e){}
 d.setAttribute('data-theme',t);d.setAttribute('data-density',y);
})();
