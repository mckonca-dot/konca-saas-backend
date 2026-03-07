import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AppointmentService {
  constructor(
    private prisma: PrismaService, 
    private notifier: NotificationService
  ) {}

  // 🚀 NİHAİ DEDEKTİF: JavaScript'in saat formatlarını çöpe atıp sadece rakamları okur!
  private parseDateStrict(input: any): Date {
    const str = input instanceof Date ? input.toISOString() : String(input).trim();
    const match = str.match(/\d+/g);
    if (!match || match.length < 5) return new Date();

    let year, month, day, hours, minutes;
    
    if (match.length === 4) {
        year = Number(match);
        month = Number(match) - 1;
        day = Number(match);
        hours = Number(match);
        minutes = Number(match);
    } else {
        day = Number(match);
        month = Number(match) - 1;
        year = Number(match);
        hours = Number(match);
        minutes = Number(match);
    }

    const finalDate = new Date(Date.UTC(year, month, day, hours - 3, minutes));
    
    return finalDate;
  }

  // 🚀 SİHİRLİ DÖNÜŞTÜRÜCÜ: Şablonlardaki etiketleri gerçek verilerle değiştirir
  private formatTemplate(template: string, data: any): string {
    if (!template) return "";
    return template
      .replace(/\[MUSTERI_ADI\]/g, data.customerName || "Müşterimiz")
      .replace(/\[TARIH\]/g, data.date || "")
      .replace(/\[SAAT\]/g, data.time || "")
      .replace(/\[ISLEM\]/g, data.serviceName || "")
      .replace(/\[DUKKAN_ADI\]/g, data.shopName || "Kuaför Salonu");
  }

  // --- 1. Randevuları Listele ---
  async getAllAppointments(userId: number) {
    return this.prisma.appointment.findMany({
      where: { ...(userId && { userId: userId }) },
      include: { customer: true, service: true, staff: true },
      orderBy: { dateTime: 'desc' },
    });
  }

  // --- 2. Randevu Oluştur (OTOMATİK ONAYLI VERSİYON) ---
  async createAppointment(userId: number, data: any) {
    const { customerId, serviceId, dateTime, staffId, customerName, customerPhone, customerNote } = data;

    const appointmentDate = this.parseDateStrict(dateTime);
    if (isNaN(appointmentDate.getTime())) throw new BadRequestException('Tarih formatı anlaşılamadı!');
    if (appointmentDate.getDay() === 0) throw new BadRequestException('Pazar günleri dükkanımız kapalıdır.');

    const service = await this.prisma.service.findUnique({ where: { id: Number(serviceId) } });
    if (!service) throw new BadRequestException('Hizmet bulunamadı.');

    let customer: any = null;
    if (customerId) {
       customer = await this.prisma.customer.findUnique({ where: { id: Number(customerId) } });
    }
    const cName = customer?.name || customerName || "Müşteri";
    const cPhone = customer?.phone || customerPhone || "";

    let staff: any = null;
    if (staffId) {
        staff = await this.prisma.staff.findUnique({ where: { id: Number(staffId) } });
    }

    // 🚀 Dükkan Sahibini (User) ve Şablonlarını Çekiyoruz
    const user = await this.prisma.user.findUnique({ where: { id: userId || 1 } });

    const appointment = await this.prisma.appointment.create({
      data: {
        dateTime: appointmentDate,
        status: 'CONFIRMED', 
        note: customerNote || "",
        ...(customerId && { customer: { connect: { id: Number(customerId) } } }),
        service: { connect: { id: Number(serviceId) } },
        user: { connect: { id: userId || 1 } },
        ...(staffId && { staff: { connect: { id: Number(staffId) } } })
      },
      include: { customer: true, service: true, staff: true }
    });

    const dateOnlyStr = appointmentDate.toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long' });
    const timeOnlyStr = appointmentDate.toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit' });

    // 📱 PERSONEL/PATRON BİLDİRİMİ (Bunu sabit bıraktık ki dükkan içi bilgi net olsun)
    const patronMesaj = `🔔 *YENİ RANDEVU EKLENDİ*\n\n📞 *Müşteri:* ${cName}\n✂️ *Hizmet:* ${service.name}\n🗓 *Tarih:* ${dateOnlyStr} - ${timeOnlyStr}\n` +
      (staff ? `👤 *Personel:* ${staff.name}\n` : ``) +
      (customerNote ? `📝 *Not:* ${customerNote}\n\n` : `\n`) +
      `Sistem tarafından takvime eklendi.`;

    const targetPhone = staff?.phone ? staff.phone : '905319485682'; 
    await this.notifier.sendMessage(userId, targetPhone, patronMesaj); 

    // 📱 MÜŞTERİ BİLDİRİMİ (DİNAMİK ŞABLON)
    if (cPhone) {
      const rawTemplate = user?.msgTemplateOnay || "Merhaba [MUSTERI_ADI],\n\n[TARIH] günü saat [SAAT] için [ISLEM] randevunuz onaylanmıştır. ✂️\n\n📍 [DUKKAN_ADI]";
      
      const musteriMesaj = this.formatTemplate(rawTemplate, {
        customerName: cName,
        date: dateOnlyStr,
        time: timeOnlyStr,
        serviceName: service.name,
        shopName: user?.shopName
      });

      await this.notifier.sendMessage(userId, cPhone, musteriMesaj);
    }
    
    return appointment;
  }

  // --- 3. Silme ---
  async deleteAppointment(id: number) {
    return this.prisma.appointment.delete({ where: { id: Number(id) } });
  }

  // --- 4. Güncelleme ve İPTAL ETME ---
  async updateAppointment(id: number, data: any) {
    const appointment = await this.prisma.appointment.update({
      where: { id: Number(id) },
      data: { status: data.status },
      include: { customer: true, service: true, user: true } // 🚀 User'ı da ekledik ki şablonları alabilelim
    });
    
    try {
        const dateOnlyStr = new Date(appointment.dateTime).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long' });
        const timeOnlyStr = new Date(appointment.dateTime).toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit' });
        
        if (data.status === 'CANCELLED' && appointment.customer?.phone) {
             const rawTemplate = appointment.user?.msgTemplateIptal || "Sayın [MUSTERI_ADI],\n\n[TARIH] - [SAAT] tarihli [ISLEM] randevunuz iptal edilmiştir.\n\n📍 [DUKKAN_ADI]";
             
             let iptalMesaji = this.formatTemplate(rawTemplate, {
                customerName: appointment.customer?.name,
                date: dateOnlyStr,
                time: timeOnlyStr,
                serviceName: appointment.service?.name,
                shopName: appointment.user?.shopName
             });

             // Eğer iptal sebebi girilmişse mesajın sonuna ekle
             if (data.cancelReason) {
                iptalMesaji += `\n\n📝 İptal Sebebi: ${data.cancelReason}`;
             }

             await this.notifier.sendMessage(appointment.userId, appointment.customer.phone, iptalMesaji);
        }
    } catch (e) {
        console.log("Bildirim hatası:", e);
    }

    return appointment;
  }

  // --- 5. OTOMATİK 1 SAAT KALA HATIRLATICISI ---
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleUpcomingAppointments() {
    const now = new Date();
    const upcomingTime = new Date(now.getTime() + 65 * 60 * 1000);

    try {
      const upcomingAppointments = await this.prisma.appointment.findMany({
        where: {
          status: 'CONFIRMED', 
          isReminderSent: false,
          dateTime: { gt: now, lte: upcomingTime },
        },
        include: { customer: true, service: true, user: true, staff: true }
      });

      for (const app of upcomingAppointments) {
        const dateOnlyStr = app.dateTime.toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long' });
        const timeOnlyStr = app.dateTime.toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit' });
        
        // 📱 MÜŞTERİYE DİNAMİK HATIRLATMA
        if (app.customer && app.customer.phone) {
            const rawTemplate = app.user?.msgTemplateHatirlatma || "Merhaba [MUSTERI_ADI]! 🌟\nYarın saat [SAAT]'te [ISLEM] randevunuz olduğunu hatırlatmak isteriz.\n\n📍 [DUKKAN_ADI]";
            
            const customerMessage = this.formatTemplate(rawTemplate, {
                customerName: app.customer?.name,
                date: dateOnlyStr,
                time: timeOnlyStr,
                serviceName: app.service?.name,
                shopName: app.user?.shopName
            });

            await this.notifier.sendMessage(app.userId, app.customer.phone, customerMessage);
        }

        // 📱 PERSONELE SABİT HATIRLATMA
        if (app.staff && app.staff.phone) {
            const staffMessage = `🔔 DİKKAT: Sayın ${app.staff.name}, 1 saat sonra (${timeOnlyStr}) ${app.customer?.name || 'Müşteri'} isimli müşteri ile ${app.service.name} randevunuz bulunmaktadır. Lütfen hazırlıklarınızı tamamlayın.`;
            await this.notifier.sendMessage(app.userId, app.staff.phone, staffMessage);
        }

        await this.prisma.appointment.update({
          where: { id: app.id },
          data: { isReminderSent: true },
        });
      }
    } catch (error) {
      console.error(`❌ Hatırlatma servisi çalışırken hata oluştu:`, error);
    }
  }

  // --- 6. Webhook ---
  async handleTwilioReply(from: string, body: string) {
    return "OK";
  }
}