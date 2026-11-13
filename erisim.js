// Yerel geliştirme varsayılandır; bulut ayarı yalnız sunucunun ayarlar.json dosyasından gelir.
export async function loadSharedConfig(){
 const response=await fetch('ayar.json',{cache:'no-store'});
 if(!response.ok)throw new Error('Bağlantı ayarı okunamadı.');
 const config=await response.json();
 if(config.yerel_test&&config.kip==='yerel')return config;
 // Bulut ekip girişi açıksa (yalnız sunum dalı) Çalışma Profili listesi korunur.
 if(config.kip==='bulut'&&config.t32_cloud)return {...config,gosteri_kisileri:config.bulut_giris?(config.gosteri_kisileri??[]):[],yerel_hesap:false,ortak_test:false};
 throw new Error('Çalışma kipi tanımlı değil. Yerel ayarı kontrol edin.');
}
