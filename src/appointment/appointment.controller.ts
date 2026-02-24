import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('appointments') // Sınıf düzeyindeki Guard'ı kaldırdık!
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @UseGuards(AuthGuard('jwt')) // Listelemeyi sadece admin yapabilir
  @Get()
  findAll(@Req() req: any) {
    return this.appointmentService.getAllAppointments(req.user.id);
  }

  @Post() // 🔓 BURASI ARTIK HERKESE AÇIK (Guard Yok)
  create(@Req() req: any, @Body() body: any) {
    console.log("=================================");
    console.log("📨 MÜŞTERİDEN YENİ RANDEVU GELDİ:", JSON.stringify(body, null, 2));
    console.log("=================================");
    
    // Giriş yapmamış müşteriler için userId'yi body'den al veya varsayılan (1) yap
    const userId = req.user?.id || body.userId || 1;
    return this.appointmentService.createAppointment(userId, body);
  }

  @UseGuards(AuthGuard('jwt')) // Güncellemeyi sadece admin yapabilir
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.appointmentService.updateAppointment(+id, body);
  }

  @UseGuards(AuthGuard('jwt')) // Silmeyi sadece admin yapabilir
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.appointmentService.deleteAppointment(+id);
  }

  @Post('webhook') // 🔓 Twilio için açık kapı
  async twilioWebhook(@Body() body: any) {
    console.log("📥 WhatsApp'tan cevap geldi! Mesaj:", body.Body);
    return this.appointmentService.handleTwilioReply(body.From, body.Body);
  }
}