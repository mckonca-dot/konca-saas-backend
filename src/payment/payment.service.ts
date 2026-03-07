import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  // 🚀 Shopier API Bilgileri (.env'den çekeceğiz)
  private readonly API_KEY = process.env.SHOPIER_API_KEY || 'BEKLENIYOR';
  private readonly API_SECRET = process.env.SHOPIER_API_SECRET || 'BEKLENIYOR';

  async generateShopierForm(userId: number, planQuery: string, buyerData: any) {
    // 1. Paket Fiyatlarını Belirle
    const plans: Record<string, number> = { BASIC: 500, PRO: 800, ULTRA: 1500 };
    const price = plans[planQuery] || 800;
    
    // 2. Benzersiz Sipariş Numarası Oluştur (Örn: ORD-16789123-5)
    const orderId = `ORD-${Date.now()}-${userId}`;

    // 3. Shopier Şifreleme (Signature) Algoritması
    const randomNr = Math.floor(Math.random() * 1000000).toString();
    const currency = '0'; // 0 = TL
    const dataToHash = randomNr + orderId + price.toString() + currency;
    const signature = crypto.createHmac('sha256', this.API_SECRET).update(dataToHash).digest('base64');

    // 4. Müşteriyi Shopier'e Fırlatacak Olan "Otomatik Form"
    const html = `
      <!doctype html>
      <html lang="tr">
      <head>
          <meta charset="UTF-8">
          <title>Güvenli Ödeme Noktası</title>
          <style>body { background-color: #050505; color: #f59e0b; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; font-weight: bold; font-size: 24px; }</style>
      </head>
      <body>
          <div>Shopier Güvenli Ödeme Sayfasına Aktarılıyorsunuz... Lütfen Bekleyin 🚀</div>
          <form id="shopier_form" method="post" action="https://shopier.com/ShowProduct/api_payit.php">
              <input type="hidden" name="API_key" value="${this.API_KEY}">
              <input type="hidden" name="website_index" value="1">
              <input type="hidden" name="platform_order_id" value="${orderId}">
              <input type="hidden" name="product_name" value="${planQuery} Paket Aboneligi">
              <input type="hidden" name="product_type" value="2"> <input type="hidden" name="buyer_name" value="${buyerData.firstName}">
              <input type="hidden" name="buyer_surname" value="${buyerData.lastName}">
              <input type="hidden" name="buyer_email" value="${buyerData.email}">
              <input type="hidden" name="buyer_account_age" value="0">
              <input type="hidden" name="buyer_id_nr" value="11111111111"> <input type="hidden" name="buyer_phone" value="${buyerData.phone}">
              <input type="hidden" name="billing_address" value="${buyerData.address}">
              <input type="hidden" name="billing_city" value="${buyerData.city}">
              <input type="hidden" name="billing_country" value="Turkey">
              <input type="hidden" name="billing_postcode" value="34000">
              <input type="hidden" name="shipping_address" value="${buyerData.address}">
              <input type="hidden" name="shipping_city" value="${buyerData.city}">
              <input type="hidden" name="shipping_country" value="Turkey">
              <input type="hidden" name="shipping_postcode" value="34000">
              <input type="hidden" name="total_order_value" value="${price}">
              <input type="hidden" name="currency" value="${currency}">
              <input type="hidden" name="platform" value="0">
              <input type="hidden" name="is_in_frame" value="0">
              <input type="hidden" name="current_language" value="tr-TR">
              <input type="hidden" name="modul_version" value="1.0.4">
              <input type="hidden" name="random_nr" value="${randomNr}">
              <input type="hidden" name="signature" value="${signature}">
          </form>
          <script>document.getElementById('shopier_form').submit();</script>
      </body>
      </html>
    `;

    return html;
  }
}