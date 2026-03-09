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
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.config.get('EMAIL_USER') || process.env.EMAIL_USER,
        pass: this.config.get('EMAIL_PASS') || process.env.EMAIL_PASS,
      },
    });
  }

  async signup(dto: any) { 
    const hash = await argon.hash(dto.password);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);

    try {
      // 1. Önce kullanıcıyı veritabanına kaydet
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          hash,
          shopName: dto.shopName,
          plan: dto.plan || 'TRIAL',
          trialEndsAt: trialEnd,
          verificationCode: otp,
          isVerified: false, 
        },
      });

      // 2. Mail Göndermeyi Dene
      try {
        await this.transporter.sendMail({
          from: `"Konca SaaS" <${this.config.get('EMAIL_USER') || process.env.EMAIL_USER}>`,
          to: user.email,
          subject: 'Konca SaaS - E-Posta Doğrulama Kodu',
          html: `
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 30px; background-color: #171717; color: #fff; border-radius: 15px;">
              <h2 style="color: #f59e0b;">Aramıza Hoş Geldiniz! 🚀</h2>
              <p style="font-size: 16px; color: #d1d5db;">Hesabınızı aktifleştirmek için doğrulama kodunuz:</p>
              <div style="margin: 30px auto; padding: 15px; background-color: #0a0a0a; border: 2px dashed #f59e0b; width: fit-content; border-radius: 10px;">
                <h1 style="color: #f59e0b; font-size: 48px; letter-spacing: 10px; margin: 0;">${otp}</h1>
              </div>
            </div>
          `,
        });

        return { message: 'Doğrulama kodu gönderildi', email: user.email };
      } catch (mailError) {
        // 🚀 MAİL GÖNDERİLEMEZSE KULLANICIYI GERİ SİL! (ASKIDA KALMASIN)
        console.error("Mail Hatası:", mailError);
        await this.prisma.user.delete({ where: { id: user.id } });
        throw new ForbiddenException('Mail gönderilemedi. Render ayarlarınızı kontrol edin.');
      }

    } catch (error) {
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

  // =========================================================================
  // 🚀 ŞİFREMİ UNUTTUM / SIFIRLAMA MODÜLÜ
  // =========================================================================

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException('Bu e-posta adresine ait kullanıcı bulunamadı.');

    // 6 Haneli Rastgele Kod Üret
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // Kodun geçerlilik süresi: Şu andan itibaren 15 dakika
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    // Veritabanına Kaydet
    await this.prisma.user.update({
      where: { email },
      data: { resetCode: code, resetCodeExpires: expires },
    });

    try {
      // Mevcut transporter ile mail gönderimi
      await this.transporter.sendMail({
        from: `"Konca SaaS" <${this.config.get('EMAIL_USER') || process.env.EMAIL_USER}>`,
        to: email,
        subject: '🔒 Şifre Sıfırlama Kodunuz',
        html: `
          <div style="font-family: Arial, sans-serif; text-align: center; padding: 30px; background-color: #171717; color: #fff; border-radius: 15px;">
            <h2 style="color: #f59e0b;">Şifre Sıfırlama İsteği</h2>
            <p style="font-size: 16px; color: #d1d5db;">Hesabınızın şifresini yenilemek için kodunuz:</p>
            <div style="margin: 30px auto; padding: 15px; background-color: #0a0a0a; border: 2px dashed #f59e0b; width: fit-content; border-radius: 10px;">
              <h1 style="color: #f59e0b; font-size: 48px; letter-spacing: 10px; margin: 0;">${code}</h1>
            </div>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">Bu kod 15 dakika boyunca geçerlidir. Bu isteği siz yapmadıysanız lütfen bu e-postayı dikkate almayın.</p>
          </div>
        `,
      });

      return { message: 'Kod başarıyla gönderildi.' };
    } catch (error) {
      console.error("Mail gönderme hatası:", error);
      throw new BadRequestException('E-posta gönderilirken bir hata oluştu.');
    }
  }

  async resetPassword(dto: any) {
    const { email, code, newPassword } = dto;
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    // Kod doğru mu ve süresi dolmamış mı kontrol et
    if (!user || user.resetCode !== code || !user.resetCodeExpires || user.resetCodeExpires < new Date()) {
      throw new BadRequestException('Geçersiz veya süresi dolmuş kod.');
    }

    // Yeni şifreyi argon2 ile kriptola (Senin sistemin argon2 kullanıyor)
    const newHash = await argon.hash(newPassword);

    // Yeni şifreyi kaydet ve eski kodları temizle (GÜVENLİK!)
    await this.prisma.user.update({
      where: { email },
      data: {
        hash: newHash, // Senin tablon password değil, hash kullanıyor
        resetCode: null,
        resetCodeExpires: null,
      },
    });

    return { message: 'Şifreniz başarıyla güncellendi.' };
  }
}