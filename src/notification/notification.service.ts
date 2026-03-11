import { Injectable } from '@nestjs/common';
import makeWASocket, { DisconnectReason, useMultiFileAuthState, fetchLatestWaWebVersion, Browsers } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as qrcode from 'qrcode';
import * as fs from 'fs';
import pino from 'pino'; 

@Injectable()
export class NotificationService {
  // 🚀 SİHİRLİ DOKUNUŞ: Bunları "static" yaptık. 
  // NestJS yanlışlıkla 2 farklı servis (sekreter) oluştursa bile hafızayı (RAM) ORTAK kullanacaklar!
  private static sockets = new Map<number, any>();
  private static qrCodes = new Map<number, string>();
  private static statuses = new Map<number, string>(); 

  // --- 1. KUAFÖRÜN WHATSAPP'INI BAŞLAT ---
  async initializeClient(rawShopId: any) {
    const shopId = Number(rawShopId); 
    
    const currentStatus = NotificationService.statuses.get(shopId);
    if (currentStatus === 'INITIALIZING' || currentStatus === 'CONNECTED') {
        console.log(`[Mağaza ${shopId}] Zaten bir işlem sürüyor (${currentStatus}), yeni istek engellendi.`);
        return;
    }

    NotificationService.statuses.set(shopId, 'INITIALIZING');
    console.log(`[Mağaza ${shopId}] RAM Dostu Baileys WhatsApp motoru çalıştırılıyor...`);

    const authFolder = `./auth_info/shop_${shopId}`;
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);

    const { version } = await fetchLatestWaWebVersion();
    console.log(`[Mağaza ${shopId}] Güncel WhatsApp Sürümü Kullanılıyor: v${version.join('.')}`);

    const sock = makeWASocket({
      version, 
      browser: Browsers.macOS('Desktop'), 
      auth: state,
      printQRInTerminal: false, 
      logger: pino({ level: 'error' }) as any, 
      syncFullHistory: false, 
      generateHighQualityLinkPreview: false, 
      // 👻 HAYALET MODU 1: Bağlanırken "Çevrimiçi" olarak işaretleme!
      markOnlineOnConnect: false, 
    });

    NotificationService.sockets.set(shopId, sock);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        const qrDataUrl = await qrcode.toDataURL(qr);
        NotificationService.qrCodes.set(shopId, qrDataUrl);
        NotificationService.statuses.set(shopId, 'QR_READY');
        console.log(`[Mağaza ${shopId}] QR Kod hazır! Panelden okutulması bekleniyor...`);
      }

      if (connection === 'close') {
        const error = (lastDisconnect?.error as Boom);
        const statusCode = error?.output?.statusCode;
        
        console.error(`[Mağaza ${shopId}] ❌ Bağlantı koptu. Hata Kodu: ${statusCode} | Mesaj: ${error?.message}`);

        const isFatal = statusCode === 401 || statusCode === 403 || statusCode === 405 || statusCode === 500;

        if (isFatal) {
           console.log(`[Mağaza ${shopId}] Ölümcül hata (${statusCode}). Dosyalar siliniyor ve döngü KIRILIYOR.`);
           if (fs.existsSync(authFolder)) {
             fs.rmSync(authFolder, { recursive: true, force: true });
           }
           NotificationService.statuses.set(shopId, 'DISCONNECTED');
           NotificationService.sockets.delete(shopId);
           NotificationService.qrCodes.delete(shopId);
           return; 
        }
        
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) {
          NotificationService.statuses.set(shopId, 'RECONNECTING'); 
          console.log(`[Mağaza ${shopId}] 3 saniye sonra yeniden denenecek...`);
          setTimeout(() => {
              NotificationService.statuses.set(shopId, 'DISCONNECTED'); 
              this.initializeClient(shopId); 
          }, 3000);
        } else {
          NotificationService.statuses.set(shopId, 'DISCONNECTED');
          NotificationService.sockets.delete(shopId);
          NotificationService.qrCodes.delete(shopId);
          if (fs.existsSync(authFolder)) {
            fs.rmSync(authFolder, { recursive: true, force: true });
          }
        }
      } 
      
      else if (connection === 'open') {
        NotificationService.statuses.set(shopId, 'CONNECTED');
        NotificationService.qrCodes.delete(shopId);
        NotificationService.sockets.set(shopId, sock);
        console.log(`[Mağaza ${shopId}] ✅ WHATSAPP BAŞARIYLA BAĞLANDI (HAYALET MOD DEVREDE)!`);
        
        // 👻 HAYALET MODU 2: Bağlantı açıldığında kendini zorla "Çevrimdışı (unavailable)" yap.
        // Bu sayede WhatsApp "Kullanıcı telefonda değil" diyerek bildirimleri sana göndermeye başlar.
        try {
            await sock.sendPresenceUpdate('unavailable');
        } catch (e) {
            console.log(`[Mağaza ${shopId}] Durum güncellenirken ufak bir pürüz:`, e);
        }
      }
    });
  }

  // --- 2. DURUM VE QR KOD SORGULAMA ---
  async getStatus(rawShopId: any) {
    const shopId = Number(rawShopId); 
    return {
      status: NotificationService.statuses.get(shopId) || 'DISCONNECTED',
      qr: NotificationService.qrCodes.get(shopId) || null
    };
  }

  // --- 3. ÇIKIŞ YAP (BAĞLANTIYI KES) ---
  async logout(rawShopId: any) {
    const shopId = Number(rawShopId); 
    const sock = NotificationService.sockets.get(shopId);
    if (sock) {
      try {
        await sock.logout();
      } catch (e) { }
      NotificationService.sockets.delete(shopId);
      NotificationService.qrCodes.delete(shopId);
      NotificationService.statuses.set(shopId, 'DISCONNECTED');
      
      const authFolder = `./auth_info/shop_${shopId}`;
      if (fs.existsSync(authFolder)) {
        fs.rmSync(authFolder, { recursive: true, force: true });
      }
      console.log(`[Mağaza ${shopId}] Çıkış yapıldı ve temizlendi.`);
    }
  }

  // --- 4. MESAJ GÖNDERME MOTORU ---
  async sendMessage(rawShopId: any, to: string, message: string) {
    const shopId = Number(rawShopId); 
    
    // 🚀 Artık tüm sekreterler ORTAK tahtaya (static variables) bakıyor!
    const sock = NotificationService.sockets.get(shopId);
    const status = NotificationService.statuses.get(shopId);
    
    if (!sock || status !== 'CONNECTED') {
      console.log(`[Mağaza ${shopId}] WhatsApp bağlı değil (Durum: ${status || 'tanımsız'}), mesaj gönderilemedi.`);
      return false;
    }

    let formattedNumber = to.replace(/\D/g, '');
    if (formattedNumber.length === 10) formattedNumber = '90' + formattedNumber; 
    if (formattedNumber.length === 11 && formattedNumber.startsWith('0')) formattedNumber = '90' + formattedNumber.substring(1);
    
    const jid = formattedNumber + '@s.whatsapp.net';

    try {
      await sock.sendMessage(jid, { text: message });
      console.log(`[Mağaza ${shopId}] 📨 Mesaj gönderildi -> ${formattedNumber}`);
      return true;
    } catch (error) {
      console.error(`[Mağaza ${shopId}] ❌ Mesaj hatası:`, error);
      return false;
    }
  }
}