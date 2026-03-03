import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService, private notifier: NotificationService) {}

  // 👇 YENİ: Vitrin için tüm dükkanları çeken fonksiyon
// 👇 DÜZELTİLMİŞ: Vitrin için tüm dükkanları ve HİZMETLERİNİ çeken fonksiyon
  async getAllPublicShops() {
    const shops = await this.prisma.user.findMany({
      select: {
        id: true, 
        shopName: true,
        address: true,
        city: true,       
        district: true,   
        coverImage: true,
        logo: true,
        // 👇 YENİ: Sadece 'Aktif' olan hizmetleri de getiriyoruz
        services: {
          where: { isActive: true },
          select: { name: true, price: true }
        }
      },
    });
    
    return shops;
  }

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

  // ... (Geri kalan kodlarınız aynı kalacak)
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

  // 🚀 TERTEMİZ DÖNÜŞTÜRÜCÜ (Frontend artık düzgün veri yolladığı için sıfır matematik!)
  private parseDateStrict(input: any): Date {
    const d = new Date(input);
    if (isNaN(d.getTime())) return new Date();
    return d;
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