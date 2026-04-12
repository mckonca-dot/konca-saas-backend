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

  @Cron(CronExpression.EVERY_MINUTE)
  async checkUpcomingAppointments() {
    try {
      const now = new Date();
      const thirtyMinsLater = new Date(now.getTime() + 30 * 60000);

      const upcomingAppointments = await this.prisma.appointment.findMany({
        where: {
          dateTime: {
            gte: now,
            lte: thirtyMinsLater,
          },
          status: 'CONFIRMED',
          isReminderSent: false,
        },
        include: {
          customer: true,
          staff: true,
          service: true,
          user: true, 
        },
      });

      for (const app of upcomingAppointments) {
        // 🎯 GÜVENLİK: dateTime yoksa atla
        if (!app.dateTime) continue;

        const timeStr = app.dateTime.toLocaleTimeString('tr-TR', {
          timeZone: 'Europe/Istanbul',
          hour: '2-digit',
          minute: '2-digit',
        });

        // 1️⃣ MÜŞTERİYE BİLDİRİM
        if (app.customer && app.customer.phone) {
          // 🎯 customer?.name || 'Müşteri' kullanımı TS hatasını kökten çözer
          const customerMsg = `⏳ *Hatırlatma:* Sayın ${app.customer?.name || 'Müşteri'}, ${app.user.shopName} dükkanındaki ${app.service.name} randevunuza 30 dakika kalmıştır. Saat ${timeStr}'da sizi bekliyoruz!`;
          await this.notificationService.sendMessage(app.userId, app.customer.phone, customerMsg);
        }

        // 2️⃣ PERSONELE (USTAYA) BİLDİRİM
        if (app.staff && app.staff.phone) {
          // 🎯 Burada da müşteri ismini güvenli bir şekilde çekiyoruz
          const staffMsg = `🔔 *Randevu Alarmı:* Usta, saat ${timeStr}'da ${app.customer?.name || 'Müşteri'} ile ${app.service.name} randevunuz var. Yaklaşık 30 dakika kaldı, hazırlıklı olun!`;
          await this.notificationService.sendMessage(app.userId, app.staff.phone, staffMsg);
        }

        // 3️⃣ GÜNCELLEME
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