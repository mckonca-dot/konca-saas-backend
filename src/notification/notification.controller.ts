import { Controller, Get, Post, Param, ParseIntPipe } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('whatsapp')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // 1. QR Kodu Üret / Başlat
  @Post('start/:shopId')
  async startWhatsapp(@Param('shopId', ParseIntPipe) shopId: number) {
    this.notificationService.initializeClient(shopId);
    return { message: "WhatsApp başlatma tetiklendi." };
  }

  // 2. Durumu ve QR Kodu Getir
  @Get('status/:shopId')
  async getStatus(@Param('shopId', ParseIntPipe) shopId: number) {
    return this.notificationService.getStatus(shopId);
  }

  // 3. Çıkış Yap
  @Post('logout/:shopId')
  async logout(@Param('shopId', ParseIntPipe) shopId: number) {
    await this.notificationService.logout(shopId);
    return { message: "Çıkış yapıldı." };
  }
}