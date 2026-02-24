import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServiceService {
  constructor(private prisma: PrismaService) {}

  // Hizmet Ekle
  async createService(userId: number, dto: any) {
    return this.prisma.service.create({
      data: {
        userId,
        name: dto.name,
        duration: dto.duration ? Number(dto.duration) : 30,
        price: dto.price,
        isActive: true, // Varsayılan olarak aktif başlasın
      },
    });
  }

  // Hizmetleri Getir
  async getServices(userId: number) {
    return this.prisma.service.findMany({
      where: { userId },
      orderBy: { id: 'asc' }
    });
  }

  // Hizmet Sil
  async deleteService(id: number, userId: number) {
    const service = await this.prisma.service.findFirst({ where: { id, userId } });
    if (!service) throw new BadRequestException('Hizmet bulunamadı');
    return this.prisma.service.delete({ where: { id } });
  }

  // Hizmet Güncelle (GÜNCELLENMİŞ HALİ)
  async updateService(id: number, userId: number, dto: any) {
    const service = await this.prisma.service.findFirst({ where: { id, userId } });
    if (!service) throw new BadRequestException('Hizmet bulunamadı');

    return this.prisma.service.update({
      where: { id },
      data: {
        name: dto.name,
        duration: dto.duration ? Number(dto.duration) : undefined,
        price: dto.price,
        isActive: dto.isActive, // <--- KRİTİK EKLEME: Bunu ekledik!
      }
    });
  }
}