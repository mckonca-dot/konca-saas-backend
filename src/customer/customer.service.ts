import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  // 1. Yeni Müşteri Oluştur (Dashboard içinden manuel ekleme için)
  async create(userId: number, dto: any) {
    return this.prisma.customer.create({
      data: {
        ...dto,
        userId: userId,
      },
    });
  }

  // 2. Tüm Müşterileri Getir (Dükkan sahibine özel)
  async findAll(userId: number) {
    return this.prisma.customer.findMany({
      where: { userId: userId },
      include: {
        appointments: true, // Müşterinin geçmiş randevularını da görmek istersen
      },
    });
  }

  // 3. Müşteri Notunu Güncelle (Daha önce eklediğimiz fonksiyon)
  async updateNote(customerId: number, note: string) {
    return this.prisma.customer.update({
      where: { id: customerId },
      data: { notes: note },
    });
  }

  // 4. Müşteriyi Sil
  async remove(id: number) {
    return this.prisma.customer.delete({
      where: { id: id },
    });
  }
}