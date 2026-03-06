import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  // --- 1. Personel Ekle (LİMİT KONTROLLÜ 🛡️) ---
  async createStaff(userId: number, data: any) {
    const numericUserId = Number(userId);

    // 🚀 ADIM A: Kullanıcının mevcut planını ve personel sayısını çek
    const user = await this.prisma.user.findUnique({
      where: { id: numericUserId },
      include: {
        _count: {
          select: { staff: true } // Mevcut personel sayısı
        }
      }
    });

    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

    // 🚀 ADIM B: Plan limitlerini tanımla
    const planLimits: Record<string, number> = {
      'TRIAL': 5,  // Deneme süresinde 5 personel
      'BASIC': 5,  // 500₺ paketinde 5 personel
      'PRO': 10,   // 800₺ paketinde 10 personel
      'ULTRA': 999 // 1500₺ paketinde sınırsız
    };

    const currentLimit = planLimits[user.plan] || 5;

    // 🚀 ADIM C: Limit kontrolü yap
    if (user._count.staff >= currentLimit) {
      throw new ForbiddenException(
        `Mevcut ${user.plan} planınızda en fazla ${currentLimit} personel ekleyebilirsiniz. Lütfen planınızı yükseltin.`
      );
    }

    // Limit aşılmadıysa kayda devam et
    return this.prisma.staff.create({
      data: {
        userId: numericUserId,
        name: data.name,
        phone: data.phone,
        email: data.email,
      },
    });
  }

  // --- 2. Personelleri Getir ---
  async getStaffs(userId: number) {
    return this.prisma.staff.findMany({
      where: { userId: Number(userId) },
    });
  }

  // --- 3. Personel Güncelle ---
  async updateStaff(id: number, userId: number, data: any) {
    const numericId = Number(id);
    const numericUserId = Number(userId);

    const existingStaff = await this.prisma.staff.findFirst({
      where: { id: numericId, userId: numericUserId }
    });

    if (!existingStaff) {
      throw new NotFoundException('Personel bulunamadı veya yetkiniz yok.');
    }

    return this.prisma.staff.update({
      where: { id: numericId },
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
      }
    });
  }

  // --- 4. Personel Sil ---
  async deleteStaff(id: number, userId: number) {
    const numericId = Number(id);
    const numericUserId = Number(userId);

    await this.prisma.staffLeave.deleteMany({
      where: { staffId: numericId }
    });

    return this.prisma.staff.deleteMany({
      where: { id: numericId, userId: numericUserId }
    });
  }
}