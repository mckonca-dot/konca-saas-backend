import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  // Kullanıcıyı ID ile Bul
  async getUserById(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return null;

    const { hash, ...result } = user;
    return result;
  }

  // Kullanıcı Güncelleme (Dükkan Bilgileri Eklendi)
  async updateUser(userId: number, data: any) {
    const updateData: any = {};

    if (data.email !== undefined) updateData.email = data.email;
    if (data.password) {
      updateData.hash = await bcrypt.hash(data.password, 10);
    }
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    
    // 👇 YENİ: Dükkan ayarları için eklendi
    if (data.shopName !== undefined) updateData.shopName = data.shopName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.tagline !== undefined) updateData.tagline = data.tagline;

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
}