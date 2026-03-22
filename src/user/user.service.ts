import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  // 🚀 SİHİRLİ FONKSİYON: Türkçe Karakterleri ve Boşlukları Temizler
  private generateSlug(text: string): string {
    if (!text) return 'isimsiz-kuafor-' + Math.floor(Math.random() * 1000);
    
    const trMap: { [key: string]: string } = {
        'ç': 'c', 'ğ': 'g', 'ş': 's', 'ü': 'u', 'ı': 'i', 'ö': 'o',
        'Ç': 'c', 'Ğ': 'g', 'Ş': 's', 'Ü': 'u', 'İ': 'i', 'Ö': 'o'
    };
    
    let slug = text.toLowerCase();
    
    // Türkçe karakterleri değiştir
    slug = slug.replace(/[çğşüıöÇĞŞÜİÖ]/g, match => trMap[match] || match);
    
    // Alfasayısal olmayanları sil, boşlukları tire yap, baştaki sondaki tireleri sil
    slug = slug
        .replace(/[^a-z0-9\s-]/g, '') // Özel karakterleri sil
        .trim()
        .replace(/\s+/g, '-') // Boşlukları tire yap
        .replace(/-+/g, '-'); // Yan yana çok tire varsa tek yap

    return slug;
  }

  // 🚀 GÜVENLİK KALKANI: Eğer bu slug daha önce alınmışsa (veya başkasına aitse) sonuna kod ekler
  private async getUniqueSlug(baseSlug: string, excludeUserId: number): Promise<string> {
    let slug = baseSlug;
    let isUnique = false;
    let counter = 1;

    while (!isUnique) {
      // Benim dışımdaki kullanıcılarda bu slug var mı diye bak
      const existingUser = await this.prisma.user.findFirst({ 
        where: { slug: slug, id: { not: excludeUserId } } 
      });
      
      if (!existingUser) {
        isUnique = true;
      } else {
        // Eğer slug başkası tarafından doluysa sonuna rastgele karakter ekle
        const randomString = Math.random().toString(36).substring(2, 6);
        slug = `${baseSlug}-${randomString}`;
        counter++;
      }
    }
    return slug;
  }

  // Kullanıcıyı ID ile Bul
  async getUserById(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return null;

    const { hash, ...result } = user;
    return result;
  }

  // Kullanıcı Güncelleme (Slug Dinamiği Eklendi!)
  async updateUser(userId: number, data: any) {
    const updateData: any = {};

    if (data.email !== undefined) updateData.email = data.email;
    if (data.password) {
      updateData.hash = await bcrypt.hash(data.password, 10);
    }
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    
    // 👇 DÜKKAN İSMİ DEĞİŞİRSE, SLUG (LİNK) DE OTOMATİK DEĞİŞSİN!
    if (data.shopName !== undefined) {
      updateData.shopName = data.shopName;
      
      // Dükkan isminden yeni slug üret ve benzersiz mi kontrol et
      const baseSlug = this.generateSlug(data.shopName);
      updateData.slug = await this.getUniqueSlug(baseSlug, userId);
    }
    
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.tagline !== undefined) updateData.tagline = data.tagline;
    if (data.address !== undefined) updateData.address = data.address;
    
    // 🌍 İl ve İlçe
    if (data.city !== undefined) updateData.city = data.city;
    if (data.district !== undefined) updateData.district = data.district;

    // 🚀🚀 KURUMSAL GÖRSELLER 🚀🚀
    if (data.logo !== undefined) updateData.logo = data.logo;
    if (data.coverImage !== undefined) updateData.coverImage = data.coverImage;

    // 🚀🚀 VİTRİN VE SOSYAL MEDYA ALANLARI 🚀🚀
    if (data.addressTitle !== undefined) updateData.addressTitle = data.addressTitle;
    if (data.fullAddress !== undefined) updateData.fullAddress = data.fullAddress;
    if (data.instagram !== undefined) updateData.instagram = data.instagram;
    if (data.facebook !== undefined) updateData.facebook = data.facebook;
    if (data.twitter !== undefined) updateData.twitter = data.twitter;
    
    // 🌟 YENİ: GOOGLE HARİTALAR LİNKİ KAYIT MOTORU 🌟
    if (data.googleMapsUrl !== undefined) updateData.googleMapsUrl = data.googleMapsUrl;

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  // Saat Güncelleme
  async updateWorkHours(userId: number, start: string, end: string) {
    console.log(`⏳ Saat Güncelleme İsteği: ID=${userId}, ${start} - ${end}`);
    
    return this.prisma.user.update({
      where: { id: userId },
      data: { 
        workStart: start, 
        workEnd: end 
      }
    });
  }

  // 🚀 Mesaj Şablonlarını Güncelleme
  async updateTemplates(userId: number, templates: any) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        msgTemplateOnay: templates.onay,
        msgTemplateIptal: templates.iptal,
        msgTemplateHatirlatma: templates.hatirlatma,
      },
    });
  }
}