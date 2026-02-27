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

  // --- ÖZEL FONKSİYON: Tarihi Zorla TR Formatında Okur ---
  private parseDateStrict(input: any): Date {
    if (input instanceof Date) return input;

    const dateStr = String(input).trim();
    console.log(`🔍 İncelenen Tarih: ${dateStr}`);

    const matches = dateStr.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);

    if (matches) {
        const day = parseInt(matches[1]);
        const month = parseInt(matches[2]) - 1; 
        const year = parseInt(matches[3]);
        
        let hours = 0, minutes = 0;
        const timeMatch = dateStr.match(/(\d{1,2}):(\d{1,2})/);
        if (timeMatch) {
            hours = parseInt(timeMatch[1]);
            minutes = parseInt(timeMatch[2]);
        }

        // 🚀 DÜZELTME 1: SAAT KAYMASINI ÖNLEYEN KOD
        // Render UTC'de çalıştığı için Türkiye'den (UTC+3) gelen 16:00 saatini
        // gerçek evrensel saat olan 13:00'a (hours - 3) çevirip veritabanına kaydediyoruz.
        // Böylece arayüz (frontend) bu saati tekrar çektiğinde tam 16:00 olarak görecek!
        const trDate = new Date(Date.UTC(year, month, day, hours - 3, minutes));
        console.log(`✅ TR Formatı Algılandı -> Evrensel Saate Çevrildi: ${trDate.toISOString()}`);
        return trDate;
    }

    return new Date(input);
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
    
    if (appointmentDate.getTime() <= now.getTime()) {
        throw new BadRequestException('Geçmiş bir zamana randevu alamazsınız.');
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

    // 🚀 DÜZELTME 2: WhatsApp'a mesaj atarken UTC saati değil, İstanbul saatini yazdırıyoruz!
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
        // 🚀 DÜZELTME 3: İptal mesajında saati İstanbul'a sabitliyoruz
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
        // 🚀 DÜZELTME 4: Hatırlatma mesajında saati İstanbul'a sabitliyoruz
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
    console.log("Twilio Webhook devre dışı bırakıldı.");
    return "OK";
  }
}