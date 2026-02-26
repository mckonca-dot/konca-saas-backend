import { Injectable } from '@nestjs/common';
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
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
    if (this.sockets.has(shopId)) return;

    this.statuses.set(shopId, 'INITIALIZING');
    console.log(`[Mağaza ${shopId}] RAM Dostu Baileys WhatsApp motoru çalıştırılıyor...`);

    const authFolder = `./auth_info/shop_${shopId}`;
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false, 
      // 🚀 DÜZELTME 1: Özel ismi sildik, WhatsApp varsayılan imzayı kabul edip bizi engellemeyecek.
      // 🚀 DÜZELTME 2: 'silent' yerine 'error' yaptık. Sadece ölümcül hataları görüp RAM'i yine koruyacağız.
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
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        // 🚀 DÜZELTME 3: Gizli hatayı gün yüzüne çıkarıyoruz!
        console.error(`[Mağaza ${shopId}] ❌ Bağlantı koptu. Hata Kodu: ${statusCode} | Mesaj: ${error?.message}`);

        // Eğer sorun bozuk oturum veya reddedilmeyse (401, 403, 500), klasörü silip temiz bir sayfa aç.
        if (statusCode === 401 || statusCode === 403 || statusCode === 500) {
           console.log(`[Mağaza ${shopId}] Bozuk oturum dosyaları temizleniyor...`);
           if (fs.existsSync(authFolder)) {
             fs.rmSync(authFolder, { recursive: true, force: true });
           }
        }
        
        if (shouldReconnect) {
          this.sockets.delete(shopId);
          // 🚀 DÜZELTME 4: Sonsuz döngüyü engellemek için motora 3 saniye soğuma/dinlenme molası verdik.
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