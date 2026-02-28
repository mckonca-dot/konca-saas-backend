import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService, private notifier: NotificationService) {}

  // --- Dükkan Bilgilerini Getir ---
  async getShopData(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { 
        services: {
            where: { isActive: true },
            orderBy: { price: 'asc' }
        }, 
        staff: true,
      },
    });

    if (!user) throw new BadRequestException('Dükkan bulunamadı.');
    
    const { hash, ...shopData } = user;
    return shopData;
  }

  // --- Yasaklı Günler ---
  async getClosures(userId: number) {
    return this.prisma.shopClosure.findMany({ where: { userId: userId } });
  }

  async getLeaves(userId: number) {
    return this.prisma.staffLeave.findMany({ 
      where: { staff: { userId: userId } },
      include: { staff: true }
    });
  }

  // --- Belirli Bir Tarihteki Dolu Saatleri Getir ---
  async getAppointmentsByDate(userId: number, dateStr: string) {
    const startOfDay = new Date(dateStr);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(dateStr);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        userId: userId,
        dateTime: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: { not: 'CANCELLED' } 
      },
      include: { service: true } 
    });

    return appointments.map(app => ({
      start: app.dateTime,
      duration: app.service.duration,
      staffId: app.staffId
    }));
  }

  // --- Galeri ---
  async getGallery(userId: number) {
    return this.prisma.galleryItem.findMany({ 
      where: { userId: userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  // 🚀 ZIRHLI TARİH ÇEVİRİCİ (3 Saatlik Kaymayı Kökten Çözen Orijinal Formül)
  private parseDateStrict(input: any): Date {
    const dateStr = input instanceof Date ? input.toISOString() : String(input).trim();
    
    // Metnin içindeki tüm harf ve işaretleri ezip sadece rakamları alıyoruz
    const parts = dateStr.split(/[\s.:T\-Z]+/).filter(Boolean);
    
    if (!parts || parts.length < 3) return new Date();

    let year = 2026, month = 0, day = 1, hours = 0, minutes = 0;

    // Arayüzden DD.MM.YYYY HH:MM formatında geliyor (Örn: "28.02.2026 15:00")
    if (parts && parts.length === 4) {
        day = Number(parts);
        month = Number(parts) - 1; // JavaScript'te aylar 0'dan başlar
        year = Number(parts);
        hours = Number(parts || 0);
        minutes = Number(parts || 0);
    } 
    // YYYY-MM-DD Formatı
    else if (parts && parts.length === 4) {
        year = Number(parts);
        month = Number(parts) - 1;
        day = Number(parts);
        hours = Number(parts || 0);
        minutes = Number(parts || 0);
    }

    // 🔥 SİHİRLİ DOKUNUŞ: Saati zorla 3 saat geri alıp (Evrensel Saat) veritabanına yazıyoruz!
    return new Date(Date.UTC(year, month, day, hours - 3, minutes));
  }

  // --- 🚀 RANDEVU OLUŞTURMA VE WHATSAPP BİLDİRİM MOTORU ---
  async createPublicAppointment(userId: number, data: any) {
    const { serviceId, dateTime, customerName, customerPhone, staffId, customerNote } = data;

    const appointmentStart = this.parseDateStrict(dateTime);
    const now = new Date();

    if (isNaN(appointmentStart.getTime())) throw new BadRequestException('Tarih formatı geçersiz!');
    
    const service = await this.prisma.service.findUnique({ where: { id: Number(serviceId) } });
    if (!service) throw new BadRequestException('Hizmet bulunamadı.');
    if (!service.isActive) throw new BadRequestException('Bu hizmet şu an kullanılamıyor.');

    const appointmentEnd = new Date(appointmentStart.getTime() + service.duration * 60000);
    const startOfDay = new Date(appointmentStart); startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(appointmentStart); endOfDay.setHours(23,59,59,999);

    const existingAppointments = await this.prisma.appointment.findMany({
        where: {
            userId: userId,
            dateTime: { gte: startOfDay, lte: endOfDay },
            ...(staffId ? { staffId: Number(staffId) } : {}),
            status: { not: 'CANCELLED' }
        },
        include: { service: true }
    });

    for (const apt of existingAppointments) {
        const aptStart = new Date(apt.dateTime);
        const aptEnd = new Date(aptStart.getTime() + apt.service.duration * 60000);

        if (aptStart < appointmentEnd && aptEnd > appointmentStart) {
            throw new BadRequestException('⚠️ Seçilen saat aralığı dolu. Lütfen başka bir saat seçin.');
        }
    }

    let customer = await this.prisma.customer.findFirst({ where: { phone: customerPhone, userId: userId } });
    if (!customer) {
      customer = await this.prisma.customer.create({
        data: { name: customerName, phone: customerPhone, userId: userId }
      });
    }

    // 🔥 HATA BURADAYDI: "note" alanı Prisma şemanda olmadığı için silindi!
    const newAppointment = await this.prisma.appointment.create({
      data: {
        dateTime: appointmentStart,
        status: 'CONFIRMED',
        customer: { connect: { id: customer.id } },
        service: { connect: { id: Number(serviceId) } },
        user: { connect: { id: userId } },
        ...(staffId && { staff: { connect: { id: Number(staffId) } } })
      },
      include: { service: true, staff: true }
    });

    // 📱 WHATSAPP BİLDİRİM ZEKASI
    try {
        const dateStr = appointmentStart.toLocaleString('tr-TR', {
            timeZone: 'Europe/Istanbul',
            day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
        });

        if (customerPhone) {
            const musteriMesaj = `Sayın ${customerName}, ${dateStr} tarihindeki ${service.name} randevunuz başarıyla oluşturulmuş ve onaylanmıştır. Sizi bekliyoruz!`;
            await this.notifier.sendMessage(userId, customerPhone, musteriMesaj);
        }

        // WhatsApp mesajına hala "customerNote" değişkeni gidecek, sorun yok!
        const patronMesaj = 
            `🔔 *SİTEDEN YENİ RANDEVU EKLENDİ*\n\n` +
            `📞 *Müşteri:* ${customerName}\n` +
            `✂️ *Hizmet:* ${service.name}\n` +
            `🗓 *Tarih:* ${dateStr}\n` +
            (newAppointment.staff ? `👤 *Personel:* ${newAppointment.staff.name}\n` : ``) +
            (customerNote ? `📝 *Not:* ${customerNote}\n\n` : `\n`) +
            `Sistem tarafından otomatik onaylanıp takvime eklendi.`;

        const targetPhone = newAppointment.staff?.phone ? newAppointment.staff.phone : '905319485682';
        await this.notifier.sendMessage(userId, targetPhone, patronMesaj);

    } catch (error) {
        console.error("WhatsApp Bildirim Hatası (Public):", error);
    }

    return newAppointment;
  }
}