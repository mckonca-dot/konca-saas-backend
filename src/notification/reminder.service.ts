import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  // 🚀 Her 1 dakikada bir çalışıp yaklaşan randevuları tarayan robot
  @Cron(CronExpression.EVERY_MINUTE)
  async checkUpcomingAppointments() {
    try {
      const now = new Date();
      // Şu andan itibaren 30 dakika sonrası
      const thirtyMinsLater = new Date(now.getTime() + 30 * 60000);

      // Başlamasına 30 dakika veya daha az kalmış ve HENÜZ HATIRLATMA GİTMEMİŞ randevuları bul
      const upcomingAppointments = await this.prisma.appointment.findMany({
        where: {
          dateTime: {
            gte: now,
            lte: thirtyMinsLater,
          },
          status: 'CONFIRMED',
          isReminderSent: false, // Sadece gitmeyenler
        },
        include: {
          customer: true,
          staff: true,
          service: true,
          user: true, // Dükkan bilgisi
        },
      });

      for (const app of upcomingAppointments) {
        // Saati Türkiye formatında şık bir şekilde yazdır (Örn: 14:30)
        const timeStr = app.dateTime.toLocaleTimeString('tr-TR', {
          timeZone: 'Europe/Istanbul',
          hour: '2-digit',
          minute: '2-digit',
        });

        // 1️⃣ MÜŞTERİYE BİLDİRİM
        if (app.customer?.phone) {
          const customerMsg = `⏳ *Hatırlatma:* Sayın ${app.customer.name}, ${app.user.shopName} dükkanındaki ${app.service.name} randevunuza 30 dakika kalmıştır. Saat ${timeStr}'da sizi bekliyoruz!`;
          await this.notificationService.sendMessage(app.userId, app.customer.phone, customerMsg);
        }

        // 2️⃣ PERSONELE (USTAYA) BİLDİRİM
        if (app.staff?.phone) {
          const staffMsg = `🔔 *Randevu Alarmı:* Usta, saat ${timeStr}'da ${app.customer.name} ile ${app.service.name} randevunuz var. Yaklaşık 30 dakika kaldı, hazırlıklı olun!`;
          await this.notificationService.sendMessage(app.userId, app.staff.phone, staffMsg);
        }

        // 3️⃣ VERİTABANINI GÜNCELLE (Bir daha göndermesin)
        await this.prisma.appointment.update({
          where: { id: app.id },
          data: { isReminderSent: true },
        });

        this.logger.log(`Randevu ${app.id} için hatırlatmalar başarıyla gönderildi.`);
      }
    } catch (error) {
      this.logger.error('Hatırlatma robotu çalışırken hata oluştu:', error);
    }
  }
}