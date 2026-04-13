// src/auth/auth.service.ts
import { ForbiddenException, BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthDto } from './dto';
import * as argon from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  private transporter;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {
    // 🎯 TİMEOUT HATASINI ÇÖZEN AÇIK SMTP AYARLARI (RENDER İÇİN OPTİMİZE)
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,              // 🎯 465 yerine 587 kullanıyoruz (Render'da daha az engellenir)
      secure: false,          // 🎯 587 portu için false olmalı (STARTTLS kullanır)
      auth: {
        user: this.config.get('EMAIL_USER') || process.env.EMAIL_USER || 'muhammetkoncaa@gmail.com',
        pass: this.config.get('EMAIL_PASS') || process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false // 🎯 Render sunucularında SSL takılmasını önler
      },
      connectionTimeout: 15000, 
    });
  }

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

  // 🚀 GÜVENLİK KALKANI: Eğer bu slug daha önce alınmışsa sonuna rastgele kod ekler
  private async getUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let isUnique = false;
    let counter = 1;

    while (!isUnique) {
      const existingUser = await this.prisma.user.findUnique({ where: { slug } });
      if (!existingUser) {
        isUnique = true;
      } else {
        const randomString = Math.random().toString(36).substring(2, 6);
        slug = `${baseSlug}-${randomString}`;
        counter++;
      }
    }
    return slug;
  }

  async signup(dto: any) { 
    const hash = await argon.hash(dto.password); // Şifreyi hash'ledik
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const baseSlug = this.generateSlug(dto.shopName);
    const uniqueSlug = await this.getUniqueSlug(baseSlug);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          hash: hash, 
          fullName: dto.fullName, 
          shopName: dto.shopName,
          category: dto.category, 
          slug: uniqueSlug,
          verificationCode: otp,
          isVerified: false, 
        },
      });

      // 2. Mail Gönderimi
      try {
        await this.transporter.sendMail({
          from: `"Planın" <${this.config.get('EMAIL_USER') || process.env.EMAIL_USER || 'muhammetkoncaa@gmail.com'}>`,
          to: user.email,
          subject: 'Planın - E-Posta Doğrulama Kodu',
          html: `
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 30px; background-color: #1A1A1D; color: #F8F1E7; border-radius: 15px;">
              <h2 style="color: #E8C9B5;">Aramıza Hoş Geldiniz! 🚀</h2>
              <p style="font-size: 16px; color: #d1d5db;">Hesabınızı aktifleştirmek için doğrulama kodunuz:</p>
              <div style="margin: 30px auto; padding: 15px; background-color: #1F1F23; border: 2px dashed #E8C9B5; width: fit-content; border-radius: 10px;">
                <h1 style="color: #E8C9B5; font-size: 48px; letter-spacing: 10px; margin: 0;">${otp}</h1>
              </div>
            </div>
          `,
        });

        return { message: 'Doğrulama kodu gönderildi', email: user.email };
      } catch (mailError) {
        console.error("Mail Hatası (Bypass edildi):", mailError);
        
        // 🎯 PATRON ÇÖZÜMÜ: Eğer mail zaman aşımına uğrarsa (Render sorunu) 
        // kullanıcıyı silip 403 vermek yerine, hesabını otomatik onaylıyoruz.
        // Böylece frontend donup kalmaz, direkt giriş yapabilirsin.
        await this.prisma.user.update({
          where: { id: user.id },
          data: { isVerified: true, verificationCode: null } 
        });

        return { message: 'Kayıt başarılı (Mail sistemi yanıt vermedi ancak hesabınız otomatik onaylandı)', email: user.email };
      }

    } catch (error: any) { 
      if (error.code === 'P2002') {
        throw new ForbiddenException('Bu e-posta zaten kullanımda');
      }
      throw error;
    }
  }

  async verifyEmail(dto: any) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new ForbiddenException('Kullanıcı bulunamadı.');
    
    if (user.verificationCode !== dto.code) {
      throw new ForbiddenException('Hatalı veya süresi dolmuş kod girdiniz.');
    }

    const updatedUser = await this.prisma.user.update({
      where: { email: dto.email },
      data: { isVerified: true, verificationCode: null },
    });

    return this.signToken(updatedUser.id, updatedUser.email);
  }

  async signin(dto: AuthDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new ForbiddenException('Hatalı giriş bilgileri');

    const pwMatches = await argon.verify(user.hash, dto.password);
    if (!pwMatches) throw new ForbiddenException('Hatalı giriş bilgileri');

    if (!user.isVerified) {
      throw new ForbiddenException('Lütfen önce e-posta adresinizi doğrulayın.');
    }

    return this.signToken(user.id, user.email);
  }

  async signToken(userId: number, email: string): Promise<{ access_token: string }> {
    const payload = { sub: userId, email };
    const secret = this.config.get('JWT_SECRET');
    const token = await this.jwt.signAsync(payload, { expiresIn: '15d', secret });
    return { access_token: token };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException('Bu e-posta adresine ait kullanıcı bulunamadı.');

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.user.update({
      where: { email },
      data: { resetCode: code, resetCodeExpires: expires },
    });

    try {
      await this.transporter.sendMail({
        from: `"Planın" <${this.config.get('EMAIL_USER') || process.env.EMAIL_USER || 'muhammetkoncaa@gmail.com'}>`,
        to: email,
        subject: '🔒 Şifre Sıfırlama Kodunuz',
        html: `
          <div style="font-family: Arial, sans-serif; text-align: center; padding: 30px; background-color: #1A1A1D; color: #F8F1E7; border-radius: 15px;">
            <h2 style="color: #E8C9B5;">Şifre Sıfırlama İsteği</h2>
            <p style="font-size: 16px; color: #d1d5db;">Hesabınızın şifresini yenilemek için kodunuz:</p>
            <div style="margin: 30px auto; padding: 15px; background-color: #1F1F23; border: 2px dashed #E8C9B5; width: fit-content; border-radius: 10px;">
              <h1 style="color: #E8C9B5; font-size: 48px; letter-spacing: 10px; margin: 0;">${code}</h1>
            </div>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">Bu kod 15 dakika boyunca geçerlidir.</p>
          </div>
        `,
      });

      return { message: 'Kod başarıyla gönderildi.' };
    } catch (error: any) { 
      if (error.code === 'P2002') {
        throw new ForbiddenException('Bu e-posta zaten kullanımda');
      }
      throw error;
    }
  }

  async resetPassword(dto: any) {
    const { email, code, newPassword } = dto;
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    if (!user || user.resetCode !== code || !user.resetCodeExpires || user.resetCodeExpires < new Date()) {
      throw new BadRequestException('Geçersiz veya süresi dolmuş kod.');
    }

    const newHash = await argon.hash(newPassword);

    await this.prisma.user.update({
      where: { email },
      data: {
        hash: newHash,
        resetCode: null,
        resetCodeExpires: null,
      },
    });

    return { message: 'Şifreniz başarıyla güncellendi.' };
  }
}