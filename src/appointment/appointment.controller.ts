import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('appointments') 
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @UseGuards(AuthGuard('jwt')) // 🛡️ Sadece patron görebilir
  @Get()
  findAll(@Req() req: any) {
    return this.appointmentService.getAllAppointments(req.user.id);
  }

  @UseGuards(AuthGuard('jwt')) // 🛡️ GÜVENLİK KİLİDİ GERİ GELDİ! (Sadece patron manuel ekleyebilir)
  @Post() 
  create(@Req() req: any, @Body() body: any) {
    console.log("=================================");
    console.log("📝 KONTROL PANELİNDEN MANUEL RANDEVU EKLENDİ");
    console.log("=================================");
    
    // 🚀 İşlemin "Manuel" olduğunu ve ID'yi token'dan (req.user.id) alarak zorla ekliyoruz.
    // Bu sayede dışarıdan hiç kimse bu rotayı kullanarak sahte randevu basamaz!
    return this.appointmentService.createAppointment(req.user.id, { ...body, isManual: true });
  }

  @UseGuards(AuthGuard('jwt')) // 🛡️ Sadece patron güncelleyebilir
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.appointmentService.updateAppointment(+id, body);
  }

  @UseGuards(AuthGuard('jwt')) // 🛡️ Sadece patron silebilir
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.appointmentService.deleteAppointment(+id);
  }

  @Post('webhook') // 🔓 Burası Twilio (WhatsApp) botumuz için açık kalmak zorunda
  async twilioWebhook(@Body() body: any) {
    console.log("📥 WhatsApp'tan cevap geldi! Mesaj:", body.Body);
    return this.appointmentService.handleTwilioReply(body.From, body.Body);
  }
}