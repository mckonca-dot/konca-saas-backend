import { Injectable } from '@nestjs/common';
import makeWASocket, { DisconnectReason, useMultiFileAuthState, fetchLatestWaWebVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as qrcode from 'qrcode';
import * as fs from 'fs';
import pino from 'pino'; 

@Injectable()
export class NotificationService {
  private static sockets = new Map<number, any>();
  private static qrCodes = new Map<number, string>();
  private static statuses = new Map<number, string>(); 

  async initializeClient(rawShopId: any) {
    const shopId = Number(rawShopId); 
    
    const currentStatus = NotificationService.statuses.get(shopId);
    if (currentStatus === 'INITIALIZING' || currentStatus === 'CONNECTED') {
        return;
    }

    NotificationService.statuses.set(shopId, 'INITIALIZING');
    console.log(`[Mağaza ${shopId}] Derin Hayalet Modu (Ghost Mode) başlatılıyor...`);

    const authFolder = `./auth_info/shop_${shopId}`;
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const { version } = await fetchLatestWaWebVersion();

    const sock = makeWASocket({
      version, 
      // 👻 SİHİRLİ DOKUNUŞ 1: Masaüstü uygulaması değil, sıradan bir web tarayıcısı gibi davran!
      browser: ['KoncaSaaS', 'Chrome', '120.0.0'], 
      auth: state,
      printQRInTerminal: false, 
      logger: pino({ level: 'error' }) as any, 
      syncFullHistory: false, 
      generateHighQualityLinkPreview: false, 
      // 👻 SİHİRLİ DOKUNUŞ 2: Bağlanırken ASLA çevrimiçi olma.
      markOnlineOnConnect: false
    });

    NotificationService.sockets.set(shopId, sock);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        const qrDataUrl = await qrcode.toDataURL(qr);
        NotificationService.qrCodes.set(shopId, qrDataUrl);
        NotificationService.statuses.set(shopId, 'QR_READY');
      }

      if (connection === 'close') {
        const error = (lastDisconnect?.error as Boom);
        const statusCode = error?.output?.statusCode;
        
        const isFatal = statusCode === 401 || statusCode === 403 || statusCode === 405 || statusCode === 500;

        if (isFatal) {
           if (fs.existsSync(authFolder)) fs.rmSync(authFolder, { recursive: true, force: true });
           NotificationService.statuses.set(shopId, 'DISCONNECTED');
           NotificationService.sockets.delete(shopId);
           NotificationService.qrCodes.delete(shopId);
           return; 
        }
        
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) {
          NotificationService.statuses.set(shopId, 'RECONNECTING'); 
          setTimeout(() => {
              NotificationService.statuses.set(shopId, 'DISCONNECTED'); 
              this.initializeClient(shopId); 
          }, 3000);
        } else {
          NotificationService.statuses.set(shopId, 'DISCONNECTED');
          NotificationService.sockets.delete(shopId);
          NotificationService.qrCodes.delete(shopId);
          if (fs.existsSync(authFolder)) fs.rmSync(authFolder, { recursive: true, force: true });
        }
      } 
      
      else if (connection === 'open') {
        NotificationService.statuses.set(shopId, 'CONNECTED');
        NotificationService.qrCodes.delete(shopId);
        NotificationService.sockets.set(shopId, sock);
        console.log(`[Mağaza ${shopId}] ✅ WHATSAPP BAŞARIYLA BAĞLANDI (DERİN HAYALET MODU)!`);
        
        // 👻 SİHİRLİ DOKUNUŞ 3: Bağlantı açıldığı an WhatsApp'a "Ben yokum" sinyali gönder.
        try {
            await sock.sendPresenceUpdate('unavailable');
        } catch (e) {}
      }
    });

    // 👻 SİHİRLİ DOKUNUŞ 4: Biri mesaj attığında bot "Yazıyor..." falan olmasın diye her olayda offline ol.
    sock.ev.on('messages.upsert', async () => {
        try { await sock.sendPresenceUpdate('unavailable'); } catch(e) {}
    });
  }

  async getStatus(rawShopId: any) {
    const shopId = Number(rawShopId); 
    return {
      status: NotificationService.statuses.get(shopId) || 'DISCONNECTED',
      qr: NotificationService.qrCodes.get(shopId) || null
    };
  }

  async logout(rawShopId: any) {
    const shopId = Number(rawShopId); 
    const sock = NotificationService.sockets.get(shopId);
    if (sock) {
      try { await sock.logout(); } catch (e) { }
      NotificationService.sockets.delete(shopId);
      NotificationService.qrCodes.delete(shopId);
      NotificationService.statuses.set(shopId, 'DISCONNECTED');
      
      const authFolder = `./auth_info/shop_${shopId}`;
      if (fs.existsSync(authFolder)) fs.rmSync(authFolder, { recursive: true, force: true });
    }
  }

  async sendMessage(rawShopId: any, to: string, message: string) {
    const shopId = Number(rawShopId); 
    const sock = NotificationService.sockets.get(shopId);
    const status = NotificationService.statuses.get(shopId);
    
    if (!sock || status !== 'CONNECTED') return false;

    let formattedNumber = to.replace(/\D/g, '');
    if (formattedNumber.length === 10) formattedNumber = '90' + formattedNumber; 
    if (formattedNumber.length === 11 && formattedNumber.startsWith('0')) formattedNumber = '90' + formattedNumber.substring(1);
    
    const jid = formattedNumber + '@s.whatsapp.net';

    try {
      await sock.sendMessage(jid, { text: message });
      console.log(`[Mağaza ${shopId}] 📨 Mesaj gönderildi -> ${formattedNumber}`);
      
      // Mesaj gönderdikten sonra da hemen görünmez ol!
      try { await sock.sendPresenceUpdate('unavailable'); } catch(e) {}
      
      return true;
    } catch (error) {
      return false;
    }
  }
}