import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GalleryService {
  constructor(private prisma: PrismaService) {}

  // Fotoğraf Ekleme (Model ismi ile)
  async create(userId: number, imageUrl: string, modelName?: string) {
    return this.prisma.galleryItem.create({
      data: {
        userId,
        imageUrl,
        modelName: modelName || "", // İsim girilmezse boş olsun
      },
    });
  }

  // Fotoğrafları Getir
  async findAll(userId: number) {
    return this.prisma.galleryItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Fotoğraf Sil
  async remove(id: number, userId: number) {
    return this.prisma.galleryItem.deleteMany({
      where: { id, userId },
    });
  }
}