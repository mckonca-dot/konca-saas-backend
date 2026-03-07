import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
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
}