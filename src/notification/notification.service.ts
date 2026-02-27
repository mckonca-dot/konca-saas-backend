import { Injectable } from '@nestjs/common';
// 🚀 DÜZELTME 1: İhtiyacımız olan sürüm çekici ve tarayıcı araçlarını import ettik
import makeWASocket, { DisconnectReason, useMultiFileAuthState, fetchLatestWaWebVersion, Browsers } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as qrcode from 'qrcode';
import * as fs from 'fs';
import pino from 'pino'; 

@Injectable()
export class NotificationService {
  private sockets = new Map<number, any>();
  private qrCodes = new Map<number, string>();
  private statuses = new Map<number, string>(); 

  // --- 1. KUAFÖRÜN WHATSAPP'INI BAŞLAT ---
  async initializeClient(shopId: number) {
    const currentStatus = this.statuses.get(shopId);
    if (currentStatus === 'INITIALIZING' || currentStatus === 'CONNECTED' || this.sockets.has(shopId)) {
        console.log(`[Mağaza ${shopId}] Zaten bir işlem sürüyor, yeni istek engellendi.`);
        return;
    }

    this.statuses.set(shopId, 'INITIALIZING');
    console.log(`[Mağaza ${shopId}] RAM Dostu Baileys WhatsApp motoru çalıştırılıyor...`);

    const authFolder = `./auth_info/shop_${shopId}`;
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);

    // 🚀 DÜZELTME 2: WhatsApp'ın bizi eski sürüm sanıp atmasını engellemek için anlık güncel sürümü çekiyoruz
    const { version } = await fetchLatestWaWebVersion();
    console.log(`[Mağaza ${shopId}] Güncel WhatsApp Sürümü Kullanılıyor: v${version.join('.')}`);

    const sock = makeWASocket({
      version, // 🚀 Güncel sürüm maskemiz
      browser: Browsers.macOS('Desktop'), // 🚀 Bot gibi değil, sıradan bir Mac Bilgisayar gibi görünüyoruz
      auth: state,
      printQRInTerminal: false, 
      logger: pino({ level: 'error' }) as any, 
      syncFullHistory: false, 
      generateHighQualityLinkPreview: false, 
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        const qrDataUrl = await qrcode.toDataURL(qr);
        this.qrCodes.set(shopId, qrDataUrl);
        this.statuses.set(shopId, 'QR_READY');
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
           this.statuses.set(shopId, 'DISCONNECTED');
           this.sockets.delete(shopId);
           this.qrCodes.delete(shopId);
           return; 
        }
        
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) {
          this.sockets.delete(shopId);
          this.statuses.set(shopId, 'DISCONNECTED'); 
          
          console.log(`[Mağaza ${shopId}] 3 saniye sonra yeniden denenecek...`);
          setTimeout(() => {
              this.initializeClient(shopId); 
          }, 3000);
        } else {
          this.statuses.set(shopId, 'DISCONNECTED');
          this.sockets.delete(shopId);
          this.qrCodes.delete(shopId);
          if (fs.existsSync(authFolder)) {
            fs.rmSync(authFolder, { recursive: true, force: true });
          }
        }
      } 
      
      else if (connection === 'open') {
        this.statuses.set(shopId, 'CONNECTED');
        this.qrCodes.delete(shopId);
        console.log(`[Mağaza ${shopId}] ✅ WHATSAPP BAŞARIYLA BAĞLANDI (HAFİF MOD)!`);
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
      console.log(`[Mağaza ${shopId}] Çıkış yapıldı ve temizlendi.`);
    }
  }

  // --- 4. MESAJ GÖNDERME MOTORU ---
  async sendMessage(shopId: number, to: string, message: string) {
    const sock = this.sockets.get(shopId);
    
    if (!sock || this.statuses.get(shopId) !== 'CONNECTED') {
      console.log(`[Mağaza ${shopId}] WhatsApp bağlı değil, mesaj gönderilemedi.`);
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