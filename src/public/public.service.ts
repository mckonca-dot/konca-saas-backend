import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService, private notifier: NotificationService) {}

  // 🌍 Vitrin için tüm dükkanları çek
  async getAllPublicShops() {
    const shops = await this.prisma.user.findMany({
      where: { isAdmin: false, isActive: true },
      select: {
        id: true, 
        shopName: true,
        slug: true, // SEO için eklendi
        address: true,
        city: true,       
        district: true,   
        coverImage: true,
        logo: true, 
        isPromoted: true, 
        isActive: true,   
        services: {
          where: { isActive: true },
          select: { name: true, price: true }
        }
      },
    });
    
    return Promise.all(shops.map(async (shop) => {
        const reviewData = await this.getGoogleReviews(shop.id);
        return {
            ...shop,
            rating: reviewData?.rating || "5.0", 
            reviewCount: reviewData?.totalReviews || 0
        };
    }));
  }

  // 🎯 SEO: Slug ile dükkan getir (GÜNCELLENDİ: Daha güvenli)
  async getShopBySlug(slug: string) {
    if (!slug) throw new BadRequestException('Geçersiz dükkan adresi.');

    const user = await this.prisma.user.findUnique({
      where: { slug: slug },
      include: { 
        services: { where: { isActive: true }, orderBy: { price: 'asc' } }, 
        staff: true,
      },
    });

    if (!user || !user.isActive) {
      throw new NotFoundException('Dükkan bulunamadı veya hizmet vermiyor.');
    }
    
    const { hash, ...shopData } = user;
    return shopData;
  }

  // 🗺️ SEO: Sitemap için tüm slugları getir
  async getAllShopSlugs() {
    return this.prisma.user.findMany({
      where: { isAdmin: false, isActive: true, slug: { not: null } }, // Boş slugları getirme
      select: { slug: true, city: true, district: true }
    });
  }

  // --- Mevcut Fonksiyonlar (ID Bazlı) ---
  async getShopData(userId: number) {
    if (!userId || isNaN(userId)) throw new BadRequestException('Geçersiz dükkan numarası.');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { 
        services: { where: { isActive: true }, orderBy: { price: 'asc' } }, 
        staff: true,
      },
    });
    
    if (!user || !user.isActive) throw new NotFoundException('Dükkan bulunamadı veya hizmet vermiyor.');
    
    const { hash, ...shopData } = user;
    return shopData;
  }

  async getClosures(userId: number) {
    return this.prisma.shopClosure.findMany({ where: { userId } });
  }

  async getLeaves(userId: number) {
    return this.prisma.staffLeave.findMany({ 
      where: { staff: { userId } },
      include: { staff: true }
    });
  }

  async getAppointmentsByDate(userId: number, dateStr: string) {
    const startOfDay = new Date(dateStr); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateStr); endOfDay.setHours(23, 59, 59, 999);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        userId,
        dateTime: { gte: startOfDay, lte: endOfDay },
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

  async getGallery(userId: number) {
    return this.prisma.galleryItem.findMany({ 
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getShopsByLocation(citySlug: string, districtSlug?: string) {
    return this.prisma.user.findMany({
      where: {
        isAdmin: false,
        isActive: true,
        city: { contains: citySlug, mode: 'insensitive' },
        ...(districtSlug ? { district: { contains: districtSlug, mode: 'insensitive' } } : {})
      },
      select: {
        id: true,
        shopName: true,
        slug: true,
        address: true,
        city: true,
        district: true,
        coverImage: true,
        logo: true,
        tagline: true
      }
    });
  }

  // --- ✍️ SEO İÇİN BLOG GETİRME MOTORU ---
  async getBlogPost(slug: string) {
    if (!slug) throw new NotFoundException('Blog yazısı bulunamadı.');

    const dummyTitle = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    return {
      id: 1,
      slug: slug,
      title: `${dummyTitle} - Planın Rehber`,
      excerpt: `${dummyTitle} hakkında bilmeniz gereken her şey ve en iyi uzmanların tavsiyeleri bu yazıda.`,
      content: `
        <h2>${dummyTitle} Nedir? Neden Önemlidir?</h2>
        <p>Saç ve güzellik trendleri her yıl değişiyor. 2026 yılına damgasını vuran bu trend, uzman kuaförler tarafından sıklıkla tercih edilmektedir. Eğer siz de tarzınızda bir yenilik yapmak istiyorsanız doğru yerdesiniz.</p>
        
        <h3>Uzman Tavsiyeleri</h3>
        <ul>
          <li><strong>Yüz hatlarınıza uygunluk:</strong> Her model her yüze gitmeyebilir. Uzmanınıza danışın.</li>
          <li><strong>Düzenli bakım:</strong> Bu stili korumak için haftalık bakımlarınızı aksatmayın.</li>
          <li><strong>Doğru ürün kullanımı:</strong> Kuaförünüzün önerdiği organik ürünleri tercih edin.</li>
        </ul>

        <p>En iyi sonucu almak için bu alanda profesyonel hizmet veren bir salon seçmeniz son derece önemlidir. Bölgenizdeki uzmanları incelemeyi unutmayın.</p>
      `,
      coverImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1200&auto=format&fit=crop',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  // --- Google Yorum Motoru & Cache ---
  private reviewCache = new Map<number, { data: any, timestamp: number }>();

  async getGoogleReviews(userId: number) {
    try {
      const cached = this.reviewCache.get(userId);
      if (cached && (Date.now() - cached.timestamp < 86400000)) return cached.data;

      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.googleMapsUrl || !process.env.GOOGLE_PLACES_API_KEY) return null;

      const searchQuery = encodeURIComponent(`${user.shopName} ${user.district} ${user.city}`);
      const placeRes = await fetch(`https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${searchQuery}&inputtype=textquery&fields=place_id&key=${process.env.GOOGLE_PLACES_API_KEY}`);
      const placeData = await placeRes.json();
      
      if (!placeData.candidates?.[0]) return null;
      const detailsRes = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeData.candidates[0].place_id}&fields=rating,user_ratings_total,reviews&language=tr&key=${process.env.GOOGLE_PLACES_API_KEY}`);
      const detailsData = await detailsRes.json();

      const result = {
        rating: detailsData.result?.rating || 5.0,
        totalReviews: detailsData.result?.user_ratings_total || 0,
        reviews: (detailsData.result?.reviews || []).filter((r: any) => r.rating >= 4).slice(0, 5)
      };

      this.reviewCache.set(userId, { data: result, timestamp: Date.now() });
      return result;
    } catch { return null; }
  }

  private parseDateStrict(input: any): Date {
    const d = new Date(input);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  // 🔥 RANDEVU OLUŞTURMA (Full Mantık)
  async createPublicAppointment(userId: number, data: any) {
    const { serviceId, dateTime, customerName, customerPhone, staffId, customerNote } = data;
    const shop = await this.prisma.user.findUnique({ where: { id: userId }});
    if (!shop || !shop.isActive) throw new BadRequestException('Randevu kabul edilmiyor.');

    const appointmentStart = this.parseDateStrict(dateTime);
    const service = await this.prisma.service.findUnique({ where: { id: Number(serviceId) } });
    if (!service) throw new BadRequestException('Hizmet bulunamadı.');

    const appointmentEnd = new Date(appointmentStart.getTime() + service.duration * 60000);
    const existing = await this.prisma.appointment.findMany({
      where: { userId, dateTime: { gte: new Date(appointmentStart.setHours(0,0,0,0)), lte: new Date(appointmentStart.setHours(23,59,59,999)) }, status: { not: 'CANCELLED' } },
      include: { service: true }
    });

    for (const apt of existing) {
      const aptStart = new Date(apt.dateTime);
      const aptEnd = new Date(aptStart.getTime() + apt.service.duration * 60000);
      if (new Date(dateTime) < aptEnd && appointmentEnd > new Date(dateTime)) throw new BadRequestException('Bu saat dolu.');
    }

    let customer = await this.prisma.customer.findFirst({ where: { phone: customerPhone, userId } });
    if (!customer) customer = await this.prisma.customer.create({ data: { name: customerName, phone: customerPhone, userId } });

    const newAppointment = await this.prisma.appointment.create({
      data: {
        dateTime: new Date(dateTime),
        status: 'CONFIRMED',
        customer: { connect: { id: customer.id } },
        service: { connect: { id: Number(serviceId) } },
        user: { connect: { id: userId } },
        ...(staffId ? { staff: { connect: { id: Number(staffId) } } } : {})
      },
      include: { service: true, staff: true }
    });

    // Bildirimler
    try {
      const dateStr = new Date(dateTime).toLocaleDateString('tr-TR');
      const timeStr = new Date(dateTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      await this.notifier.sendMessage(userId, customerPhone, `Randevunuz onaylandı: ${dateStr} ${timeStr} - ${shop.shopName}`);
      await this.notifier.sendMessage(userId, '905319485682', `Yeni Randevu: ${customerName} - ${service.name}`);
    } catch {}

    return newAppointment;
  }
}