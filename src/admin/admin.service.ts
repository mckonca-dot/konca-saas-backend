import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // 1. Tüm Dükkanları ve İstatistiklerini Çek
  async getDashboard() {
    const shops = await this.prisma.user.findMany({
      where: { isAdmin: false }, // Admini listeye dahil etme
      select: {
        id: true,
        shopName: true,
        email: true,
        phone: true,
        city: true,
        district: true,
        plan: true,
        isActive: true,
        isPromoted: true,
        createdAt: true,
        trialEndsAt: true,
        subscriptionEnd: true,
        appointments: {
          select: { service: { select: { price: true } } },
          where: { status: { not: 'CANCELLED' } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return shops.map(shop => {
      const totalAppointments = shop.appointments.length;
      const totalEarnings = shop.appointments.reduce((sum, app) => sum + Number(app.service?.price || 0), 0);
      
      const { appointments, ...shopData } = shop;
      return { ...shopData, totalAppointments, totalEarnings };
    });
  }

  // 2. Dükkan Durumunu / Süresini Güncelle
  async updateShop(id: number, data: any) {
    return this.prisma.user.update({
      where: { id: Number(id) },
      data
    });
  }

  // 3. Dükkanı Tamamen Sil (Tüm Verileriyle Birlikte)
  async deleteShop(id: number) {
    const userId = Number(id);
    
    // İlişkisel verileri sırayla temizliyoruz (Foreign Key hatası almamak için)
    await this.prisma.appointment.deleteMany({ where: { userId } }).catch(() => {});
    await this.prisma.staffLeave.deleteMany({ where: { userId } }).catch(() => {});
    await this.prisma.staff.deleteMany({ where: { userId } }).catch(() => {});
    await this.prisma.service.deleteMany({ where: { userId } }).catch(() => {});
    await this.prisma.shopClosure.deleteMany({ where: { userId } }).catch(() => {});
    
    // En son dükkanı siliyoruz
    return this.prisma.user.delete({
      where: { id: userId }
    });
  }
}