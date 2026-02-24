import { Injectable } from '@nestjs/common';
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode';

@Injectable()
export class NotificationService {
  private clients = new Map<number, Client>();
  private qrCodes = new Map<number, string>();
  private statuses = new Map<number, string>(); // 'DISCONNECTED', 'INITIALIZING', 'QR_READY', 'CONNECTED'

  // --- 1. KUAFÖRÜN WHATSAPP'INI BAŞLAT ---
  async initializeClient(shopId: number) {
    if (this.clients.has(shopId)) return;

    this.statuses.set(shopId, 'INITIALIZING');
    console.log(`[Shop ${shopId}] WhatsApp motoru çalıştırılıyor...`);

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: `shop_${shopId}` }), // Her dükkanın oturumu ayrı kaydedilir
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    client.on('qr', async (qr) => {
      const qrDataUrl = await qrcode.toDataURL(qr);
      this.qrCodes.set(shopId, qrDataUrl);
      this.statuses.set(shopId, 'QR_READY');
      console.log(`[Shop ${shopId}] QR Kod hazır! Panelden okutulması bekleniyor...`);
    });

    client.on('ready', () => {
      this.statuses.set(shopId, 'CONNECTED');
      this.qrCodes.delete(shopId);
      console.log(`[Shop ${shopId}] ✅ WHATSAPP BAŞARIYLA BAĞLANDI!`);
    });

    client.on('disconnected', (reason) => {
      this.statuses.set(shopId, 'DISCONNECTED');
      this.clients.delete(shopId);
      console.log(`[Shop ${shopId}] ❌ WhatsApp bağlantısı koptu:`, reason);
    });

    await client.initialize();
    this.clients.set(shopId, client);
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
    const client = this.clients.get(shopId);
    if (client) {
      try {
        await client.logout();
        await client.destroy();
      } catch (e) { }
      this.clients.delete(shopId);
      this.qrCodes.delete(shopId);
      this.statuses.set(shopId, 'DISCONNECTED');
      console.log(`[Shop ${shopId}] Çıkış yapıldı.`);
    }
  }

  // --- 4. MESAJ GÖNDERME MOTORU ---
  async sendMessage(shopId: number, to: string, message: string) {
    const client = this.clients.get(shopId);
    
    // Eğer o dükkan WhatsApp'ını bağlamamışsa mesaj gitmez, sistemi çökertmez.
    if (!client || this.statuses.get(shopId) !== 'CONNECTED') {
      console.log(`[Shop ${shopId}] WhatsApp bağlı değil, mesaj gönderilemedi.`);
      return false;
    }

    // Telefon numarasını WhatsApp formatına çevir (Örn: 90531... -> 90531...@c.us)
    let formattedNumber = to.replace(/\D/g, '');
    if (formattedNumber.length === 10) formattedNumber = '90' + formattedNumber; // Başında 0 yoksa 90 ekle
    if (formattedNumber.length === 11 && formattedNumber.startsWith('0')) formattedNumber = '90' + formattedNumber.substring(1);
    
    const chatId = formattedNumber + '@c.us';

    try {
      await client.sendMessage(chatId, message);
      console.log(`[Shop ${shopId}] 📨 Mesaj gönderildi -> ${formattedNumber}`);
      return true;
    } catch (error) {
      console.error(`[Shop ${shopId}] ❌ Mesaj hatası:`, error);
      return false;
    }
  }
}