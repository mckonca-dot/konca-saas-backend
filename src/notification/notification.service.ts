import { Injectable } from '@nestjs/common';
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as qrcode from 'qrcode';
import * as fs from 'fs';
import pino from 'pino'; // RAM canavarını susturacak kütüphanemiz

@Injectable()
export class NotificationService {
  private sockets = new Map<number, any>();
  private qrCodes = new Map<number, string>();
  private statuses = new Map<number, string>(); // 'DISCONNECTED', 'INITIALIZING', 'QR_READY', 'CONNECTED'

  // --- 1. KUAFÖRÜN WHATSAPP'INI BAŞLAT (BAILEYS + MAKSİMUM DİYET MODU) ---
  async initializeClient(shopId: number) {
    if (this.sockets.has(shopId)) return;

    this.statuses.set(shopId, 'INITIALIZING');
    console.log(`[Shop ${shopId}] RAM Dostu Baileys WhatsApp motoru çalıştırılıyor...`);

    // Dükkana özel oturum klasörü (Her dükkanın verisi ayrı tutulur)
    const authFolder = `./auth_info/shop_${shopId}`;
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false, // QR'ı terminalde değil sitemizde göstereceğiz
      browser: ['Konca SaaS', 'Chrome', '1.0.0'], // WhatsApp web'de görünecek cihaz adı
      
      // 🚀 İŞTE SUNUCUYU ÇÖKMEKTEN KURTARAN O SİHİRLİ RAM AYARLARI:
      logger: pino({ level: 'silent' }) as any, // Loglamayı tamamen kapatır (RAM'i korur)
      syncFullHistory: false, // Geçmiş mesajları indirmeyi engeller (Anlık yüklenmeyi önler)
      generateHighQualityLinkPreview: false, // Link önizlemelerini kapatır
    });

    // Oturum bilgilerini otomatik kaydet
    sock.ev.on('creds.update', saveCreds);

    // Bağlantı durumunu dinle
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // QR Kod gelirse frontend'e gönderilmek üzere kaydet
      if (qr) {
        const qrDataUrl = await qrcode.toDataURL(qr);
        this.qrCodes.set(shopId, qrDataUrl);
        this.statuses.set(shopId, 'QR_READY');
        console.log(`[Shop ${shopId}] QR Kod hazır! Panelden okutulması bekleniyor...`);
      }

      // Bağlantı koparsa veya çıkış yapılırsa
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log(`[Shop ${shopId}] Bağlantı kapandı. Yeniden bağlanılıyor mu:`, shouldReconnect);
        
        if (shouldReconnect) {
          // Ufak bir kopmaysa tekrar dene
          this.sockets.delete(shopId);
          this.initializeClient(shopId); 
        } else {
          // Kullanıcı kendi çıkış yaptıysa temizlik yap
          this.statuses.set(shopId, 'DISCONNECTED');
          this.sockets.delete(shopId);
          this.qrCodes.delete(shopId);
          if (fs.existsSync(authFolder)) {
            fs.rmSync(authFolder, { recursive: true, force: true });
          }
        }
      } 
      
      // Bağlantı başarılıysa
      else if (connection === 'open') {
        this.statuses.set(shopId, 'CONNECTED');
        this.qrCodes.delete(shopId);
        console.log(`[Shop ${shopId}] ✅ WHATSAPP BAŞARIYLA BAĞLANDI (HAFİF MOD)!`);
      }
    });

    this.sockets.set(shopId, sock);
  }

  // --- 2. DURUM VE QR KOD SORGULAMA ---
  async getStatus(shopId: number) {
    return {
      status: this.statuses.get(shopId) || 'DISCONNECTED',
      qr: this.qrCodes.get(shopId) || null
    };
  }

  // --- 3. ÇIKIŞ YAP (BAĞLANTIYI KES) ---
  async logout(shopId: number) {
    const sock = this.sockets.get(shopId);
    if (sock) {
      try {
        await sock.logout();
      } catch (e) { }
      this.sockets.delete(shopId);
      this.qrCodes.delete(shopId);
      this.statuses.set(shopId, 'DISCONNECTED');
      
      const authFolder = `./auth_info/shop_${shopId}`;
      if (fs.existsSync(authFolder)) {
        fs.rmSync(authFolder, { recursive: true, force: true });
      }
      console.log(`[Shop ${shopId}] Çıkış yapıldı ve temizlendi.`);
    }
  }

  // --- 4. MESAJ GÖNDERME MOTORU ---
  async sendMessage(shopId: number, to: string, message: string) {
    const sock = this.sockets.get(shopId);
    
    if (!sock || this.statuses.get(shopId) !== 'CONNECTED') {
      console.log(`[Shop ${shopId}] WhatsApp bağlı değil, mesaj gönderilemedi.`);
      return false;
    }

    let formattedNumber = to.replace(/\D/g, '');
    if (formattedNumber.length === 10) formattedNumber = '90' + formattedNumber; 
    if (formattedNumber.length === 11 && formattedNumber.startsWith('0')) formattedNumber = '90' + formattedNumber.substring(1);
    
    // Baileys'te uzantı @s.whatsapp.net şeklindedir
    const jid = formattedNumber + '@s.whatsapp.net';

    try {
      await sock.sendMessage(jid, { text: message });
      console.log(`[Shop ${shopId}] 📨 Mesaj gönderildi -> ${formattedNumber}`);
      return true;
    } catch (error) {
      console.error(`[Shop ${shopId}] ❌ Mesaj hatası:`, error);
      return false;
    }
  }
}