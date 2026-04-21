import { Controller, Post, Body, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { PaymentService } from './payment.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // 🛡️ Sadece giriş yapmış kullanıcılar ödeme başlatabilir
  @UseGuards(AuthGuard('jwt'))
  @Post('shopier')
  async initiatePayment(@Request() req, @Body() body: { plan: string; buyerData: any }) {
    const userId = req.user.id;
    // HTML formunu geriye döndürüyoruz
    return this.paymentService.generateShopierForm(userId, body.plan, body.buyerData);
  }

  // 🛡️ KULLANICI KENDİ SİPARİŞİNİ EKRANDAN GİRERSE (MANUEL DOĞRULAMA)
  @UseGuards(AuthGuard('jwt'))
  @Post('verify-order')
  async verifyOrder(@Body() body: { orderId: string, planQuery: string }, @Request() req, @Res() res: Response) {
    const { orderId, planQuery } = body;
    if (orderId && orderId.length >= 5) {
      const userId = req.user.id;
      await this.paymentService.extendSubscription(userId.toString(), planQuery || 'PRO');
      return res.status(200).json({ success: true, message: 'Onaylandı' });
    }
    return res.status(400).json({ success: false, message: 'Geçersiz sipariş numarası' });
  }

  // 🛡️ Shopier Callback Endpoint (Webhook / Başarılı Ödeme Dönüşü)
  @Post('shopier-callback')
  async shopierCallback(@Body() body: any, @Res() res: Response) {
    console.log('Shopier Callback Data:', body);
    
    // İmza doğrulaması (Opsiyonel olarak aktif edilebilir)
    /*
    const isValid = this.paymentService.verifyShopierSignature(body);
    if (!isValid) {
      return res.status(400).send('Invalid Signature');
    }
    */

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Eğer platform_order_id varsa (Sistemimizden giden sipariş, örn: ORD-16789123-5)
    if (body.platform_order_id) {
      const parts = body.platform_order_id.split('-');
      const userId = parts[2]; // 5
      const planQuery = body.product_name ? body.product_name.split(' ')[0] : 'PRO';

      if (userId) {
        // Kullanıcının aboneliğini 1 ay uzat
        await this.paymentService.extendSubscription(userId, planQuery);
        return res.redirect(`${frontendUrl}/dashboard?success=1`);
      }
    }

    // platform_order_id yoksa (Doğrudan statik link ile mağazadan alınmışsa)
    const email = body.buyer_email || '';
    const plan = body.product_name ? body.product_name.split(' ')[0] : 'BASIC';
    
    return res.redirect(`${frontendUrl}/kayit-ol?email=${encodeURIComponent(email)}&plan=${encodeURIComponent(plan)}`);
  }
}