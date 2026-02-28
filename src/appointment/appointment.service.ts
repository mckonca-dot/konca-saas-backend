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

  // 🚀 SENİN MANTIĞINLA YAZILMIŞ NİHAİ ÇÖZÜM: Saat dilimlerini yok say, "Türkiye (+03:00)" mührünü bas!
  private parseDateStrict(input: any): Date {
    const dateStr = input instanceof Date ? input.toISOString() : String(input).trim();
    console.log(`[DATE DEBUG] Gelen Ham Veri: ${dateStr}`);

    // Gelen verideki tüm rakamları parçalara ayırır (Z, T, boşluk, çizgi her şeyi çöpe atar)
    // Örn: "2026-02-28T11:00:00Z" veya "28.02.2026 11:00" -> Sadece rakamlar kalır
    const parts = dateStr.split(/[\s.:T\-Z]+/).filter(Boolean);
    
    if (!parts || parts.length < 5) return new Date(); 

    let year = 2026, month = 1, day = 1, hours = 0, minutes = 0;

    // YYYY-MM-DD Formatı (Dashboard)
    if (parts.length === 4) {
        year = Number(parts);
        month = Number(parts); // String formatında ay 1-12 arasıdır, -1 YAPMIYORUZ!
        day = Number(parts);
        hours = Number(parts);
        minutes = Number(parts);
    } 
    // DD.MM.YYYY Formatı (Chat Widget)
    else {
        day = Number(parts);
        month = Number(parts);
        year = Number(parts);
        hours = Number(parts);
        minutes = Number(parts);
    }

    // 🚀 İŞTE SİHİRLİ MÜHÜR BURADA:
    // Arayüz ne gönderirse göndersin, kullanıcının seçtiği saf saat rakamının (Örn: 11)
    // yanına "+03:00" ekliyoruz. Bu, sunucuya "BU SAAT KESİNLİKLE TÜRKİYE SAATİDİR" demektir.
    const pad = (n: number) => String(n).padStart(2, '0');
    const forcedTurkeyTimeStr = `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00.000+03:00`;
    
    const finalDate = new Date(forcedTurkeyTimeStr);
    console.log(`[DATE DEBUG] Türkiye Mühürlü Saat: ${forcedTurkeyTimeStr} -> DB'ye Giden: ${finalDate.toISOString()}`);
    
    return finalDate;
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
    const now = new Date();

    if (isNaN(appointmentDate.getTime())) {
       throw new BadRequestException('Tarih formatı anlaşılamadı!');
    }
    
    if (appointmentDate.getDay() === 0) {
        throw new BadRequestException('Pazar günleri dükkanımız kapalıdır.');
    }

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

    const dateStr = appointmentDate.toLocaleString('tr-TR', {
        timeZone: 'Europe/Istanbul',
        day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
    });

    const patronMesaj = 
      `🔔 *YENİ RANDEVU EKLENDİ*\n\n` +
      `📞 *Müşteri:* ${cName}\n` +
      `✂️ *Hizmet:* ${service.name}\n` +
      `🗓 *Tarih:* ${dateStr}\n` +
      (staff ? `👤 *Personel:* ${staff.name}\n` : ``) +
      (customerNote ? `📝 *Not:* ${customerNote}\n\n` : `\n`) +
      `Sistem tarafından otomatik onaylanıp takvime eklendi.`;

    const targetPhone = staff?.phone ? staff.phone : '905319485682'; 
    await this.notifier.sendMessage(userId, targetPhone, patronMesaj); 

    if (cPhone) {
      const musteriMesaj = `Sayın ${cName}, ${dateStr} tarihindeki ${service.name} randevunuz başarıyla oluşturulmuş ve onaylanmıştır. Sizi bekliyoruz!`;
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
      include: { customer: true, service: true }
    });
    
    try {
        const dateStr = new Date(appointment.dateTime).toLocaleString('tr-TR', { 
            timeZone: 'Europe/Istanbul',
            hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'long' 
        });
        
        if (data.status === 'CANCELLED') {
             const reasonText = data.cancelReason ? `\n\n📝 *İptal Sebebi:* ${data.cancelReason}` : '';
             const iptalMesaji = `❌ Sayın ${appointment.customer?.name || 'Müşterimiz'}, ${dateStr} tarihindeki randevunuz maalesef iptal edilmiştir.${reasonText}\n\nAnlayışınız için teşekkür eder, yeni bir randevu için sitemizi ziyaret etmenizi rica ederiz.`;
             
             if (appointment.customer?.phone) {
                 await this.notifier.sendMessage(appointment.userId, appointment.customer.phone, iptalMesaji);
             }
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
        const timeStr = app.dateTime.toLocaleTimeString('tr-TR', { 
            timeZone: 'Europe/Istanbul',
            hour: '2-digit', minute: '2-digit' 
        });
        
        if (app.customer && app.customer.phone) {
            const customerMessage = `Merhaba ${app.customer.name}, ${app.user?.shopName || 'Kuaför'} salonundaki ${app.service.name} randevunuza yaklaşık 1 saat kalmıştır (${timeStr}). Bizi tercih ettiğiniz için teşekkür ederiz!`;
            await this.notifier.sendMessage(app.userId, app.customer.phone, customerMessage);
        }

        if (app.staff && app.staff.phone) {
            const staffMessage = `🔔 DİKKAT: Sayın ${app.staff.name}, 1 saat sonra (${timeStr}) ${app.customer?.name || 'Müşteri'} isimli müşteri ile ${app.service.name} randevunuz bulunmaktadır. Lütfen hazırlıklarınızı tamamlayın.`;
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