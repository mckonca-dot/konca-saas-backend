import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  // --- 1. Personel Ekle ---
  async createStaff(userId: number, data: any) {
    return this.prisma.staff.create({
      data: {
        userId: Number(userId),
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

  // --- 3. Personel Güncelle (EKSİKTİ, YENİ EKLENDİ 🚀) ---
  async updateStaff(id: number, userId: number, data: any) {
    const numericId = Number(id);
    const numericUserId = Number(userId);

    // Güvenlik: Önce personelin bu kullanıcıya ait olup olmadığını kontrol et
    const existingStaff = await this.prisma.staff.findFirst({
      where: { id: numericId, userId: numericUserId }
    });

    if (!existingStaff) {
      throw new NotFoundException('Personel bulunamadı veya yetkiniz yok.');
    }

    // Personeli güncelle
    return this.prisma.staff.update({
      where: { id: numericId },
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
      }
    });
  }

  // --- 4. Personel Sil (YABANCI ANAHTAR HATASI ÇÖZÜLDÜ 🛡️) ---
  async deleteStaff(id: number, userId: number) {
    const numericId = Number(id);
    const numericUserId = Number(userId);

    // ADIM 1: Önce bu personele ait olan izin günlerini (StaffLeave) siliyoruz.
    // Yoksa veritabanı "izinler sahipsiz kalacak" deyip silme işlemine izin vermez (Foreign Key Hatası).
    await this.prisma.staffLeave.deleteMany({
      where: { staffId: numericId }
    });

    // NOT: Eğer randevusu olan personeli silerken de hata verirse aşağıdaki satırın başındaki // işaretlerini kaldır:
    // await this.prisma.appointment.deleteMany({ where: { staffId: numericId } });

    // ADIM 2: İzinler temizlendikten sonra personeli güvenle siliyoruz.
    return this.prisma.staff.deleteMany({
      where: { id: numericId, userId: numericUserId }
    });
  }
}