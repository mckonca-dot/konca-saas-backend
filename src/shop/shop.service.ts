import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// 🎯 DİKKAT: slugify fonksiyonunu buraya import etmelisin!
import { slugify } from '../common/utils/slugify.util'; 

@Injectable()
export class ShopService {
  constructor(private prisma: PrismaService) {}

  // ⚙️ Dükkan Ayarlarını Getir
  async getSettings(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        shopName: true,
        slug: true, // 🎯 SEO için eklendi
        phone: true,
        tagline: true,
        description: true,
        logo: true,
        coverImage: true,
        address: true,
        addressTitle: true,
        fullAddress: true,
        city: true,
        district: true,
        googleMapsUrl: true, // 🎯 Kırmızıydı, şimdi eklendi
        workStart: true,
        workEnd: true,
        instagram: true,
        facebook: true,
        twitter: true,
        msgTemplateOnay: true, // 🎯 Kırmızıydı, şimdi eklendi
        msgTemplateIptal: true,
        msgTemplateHatirlatma: true,
      },
    });

    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');
    return user;
  }

  // 🔄 Dükkan Ayarlarını Güncelle (SEO Uyumlu)
  async updateSettings(userId: number, data: any) {
    // 🚀 Eğer dükkan ismi değişmişse, slug'ı da otomatik güncelle
    if (data.shopName) {
      data.slug = slugify(data.shopName);
      
      // Çakışma kontrolü (Aynı slug başka birinde var mı?)
      const existing = await this.prisma.user.findFirst({
        where: { slug: data.slug, NOT: { id: userId } }
      });
      if (existing) {
        data.slug = `${data.slug}-${Math.floor(Math.random() * 1000)}`;
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
      },
    });
  }

  // 📊 Dashboard İstatistikleri
  async getStats(userId: number) {
    const [totalAppointments, totalCustomers, totalServices] = await Promise.all([
      this.prisma.appointment.count({ where: { userId } }),
      this.prisma.customer.count({ where: { userId } }),
      this.prisma.service.count({ where: { userId } }),
    ]);

    return { totalAppointments, totalCustomers, totalServices };
  }
}