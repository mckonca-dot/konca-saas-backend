import { Controller, Get, Post, Param, ParseIntPipe } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('whatsapp') // 🚀 Burası 'whatsapp' kalsın, Frontend buraya istek atıyor!
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('start/:shopId')
  async startWhatsapp(@Param('shopId', ParseIntPipe) shopId: number) {
    this.notificationService.initializeClient(shopId);
    return { message: "WhatsApp başlatma tetiklendi." };
  }

  @Get('status/:shopId')
  async getStatus(@Param('shopId', ParseIntPipe) shopId: number) {
    return this.notificationService.getStatus(shopId);
  }

  @Post('logout/:shopId')
  async logout(@Param('shopId', ParseIntPipe) shopId: number) {
    await this.notificationService.logout(shopId);
    return { message: "Çıkış yapıldı." };
  }
}