import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService, private notifier: NotificationService) {}

  // 👇 Vitrin (Ana Sayfa) için salonları çeken fonksiyon
  async getAllPublicShops() {
    const shops = await this.prisma.user.findMany({
      where: {
        isAdmin: false, 
        isActive: true, 
      },
      select: {
        id: true, 
        shopName: true,
        address: true,
        city: true,       
        district: true,   
        coverImage: true,
        logo: true, // 🚀 LOGO BURADA: Ana sayfadaki kartlarda görünmesini sağlar
        isPromoted: true, 
        isActive: true,   
        services: {
          where: { isActive: true },
          select: { name: true, price: true }
        }
      },
    });
    
    return shops;
  }

  // --- Dükkan Detay Bilgilerini Getir ---
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

    if (!user || !user.isActive) throw new BadRequestException('Bu dükkan şu anda hizmet vermemektedir.');
    
    // 🚀 Hash (şifre) hariç tüm verileri (Logo dahil) gönderir
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

  // --- Tarih Dönüştürücü ---
  private parseDateStrict(input: any): Date {
    const d = new Date(input);
    if (isNaN(d.getTime())) return new Date();
    return d;
  }

  // --- 🚀 RANDEVU OLUŞTURMA VE DİNAMİK WHATSAPP BİLDİRİM MOTORU ---
  async createPublicAppointment(userId: number, data: any) {
    try {
      const { serviceId, dateTime, customerName, customerPhone, staffId, customerNote } = data;

      const safeUserId = Number(userId);
      const safeServiceId = Number(serviceId);

      const shop = await this.prisma.user.findUnique({ where: { id: safeUserId }});
      if (!shop || !shop.isActive) throw new BadRequestException('Bu dükkan şu anda randevu kabul etmemektedir.');

      const appointmentStart = this.parseDateStrict(dateTime);
      if (isNaN(appointmentStart.getTime())) throw new BadRequestException('Tarih formatı geçersiz!');

      const service = await this.prisma.service.findUnique({ where: { id: safeServiceId } });
      if (!service) throw new BadRequestException('Hizmet bulunamadı.');

      const appointmentEnd = new Date(appointmentStart.getTime() + service.duration * 60000);
      const startOfDay = new Date(appointmentStart); startOfDay.setHours(0,0,0,0);
      const endOfDay = new Date(appointmentStart); endOfDay.setHours(23,59,59,999);

      const existingAppointments = await this.prisma.appointment.findMany({
          where: {
              userId: safeUserId,
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

      let customer = await this.prisma.customer.findFirst({ where: { phone: customerPhone, userId: safeUserId } });
      if (!customer) {
        customer = await this.prisma.customer.create({
          data: { name: customerName, phone: customerPhone, userId: safeUserId }
        });
      }

      // 🚀 Randevu oluşturma (Note alanı olmadan güvenli kayıt)
      const newAppointment = await this.prisma.appointment.create({
        data: {
          dateTime: appointmentStart,
          status: 'CONFIRMED',
          customer: { connect: { id: customer.id } },
          service: { connect: { id: safeServiceId } },
          user: { connect: { id: safeUserId } },
          ...(staffId ? { staff: { connect: { id: Number(staffId) } } } : {})
        },
        include: { service: true, staff: true }
      });

      // 📱 WHATSAPP BİLDİRİMİ
      try {
          const dateOnlyStr = appointmentStart.toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long' });
          const timeOnlyStr = appointmentStart.toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit' });

          if (customerPhone) {
              const rawTemplate = shop.msgTemplateOnay || "Merhaba [MUSTERI_ADI],\n\n[TARIH] günü saat [SAAT] için [ISLEM] randevunuz başarıyla oluşturulmuştur. ✂️\n\n📍 [DUKKAN_ADI]";
              const musteriMesaj = rawTemplate
                .replace(/\[MUSTERI_ADI\]/g, customerName)
                .replace(/\[TARIH\]/g, dateOnlyStr)
                .replace(/\[SAAT\]/g, timeOnlyStr)
                .replace(/\[ISLEM\]/g, service.name)
                .replace(/\[DUKKAN_ADI\]/g, shop.shopName || 'İşletmemiz');

              await this.notifier.sendMessage(safeUserId, customerPhone, musteriMesaj);
          }

          const staffObj = (newAppointment as any).staff;
          const patronMesaj = 
              `🔔 *SİTEDEN YENİ RANDEVU EKLENDİ*\n\n` +
              `📞 *Müşteri:* ${customerName}\n` +
              `✂️ *Hizmet:* ${service.name}\n` +
              `🗓 *Tarih:* ${dateOnlyStr} - Saat: ${timeOnlyStr}\n` +
              (staffObj ? `👤 *Personel:* ${staffObj.name}\n` : ``) +
              (customerNote ? `📝 *Not:* ${customerNote}\n\n` : `\n`) +
              `Sistem tarafından otomatik onaylandı.`;

          const targetPhone = staffObj?.phone ? staffObj.phone : '905319485682';
          await this.notifier.sendMessage(safeUserId, targetPhone, patronMesaj);

      } catch (waError) {
          console.error("WhatsApp Hatası:", waError);
      }

      return newAppointment;

    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Randevu oluşturulurken bir hata oluştu.');
    }
  }
}