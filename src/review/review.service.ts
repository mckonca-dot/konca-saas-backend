import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  // Yorum Ekle
  async addReview(dto: { shopId: number; rating: number; comment: string; customerName: string }) {
    return this.prisma.review.create({
      data: {
        userId: dto.shopId,
        rating: dto.rating,
        comment: dto.comment,
        customerName: dto.customerName,
      },
    });
  }

  // Dükkanın Yorumlarını Getir
  async getShopReviews(shopId: number) {
    return this.prisma.review.findMany({
      where: { userId: shopId },
      orderBy: { createdAt: 'desc' }, // En yeni en üstte
    });
  }
}