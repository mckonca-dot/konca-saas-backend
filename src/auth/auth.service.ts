import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthDto } from './dto';
import * as argon from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer'; // 🚀 Nodemailer Eklendi

@Injectable()
export class AuthService {
  private transporter;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {
    // 🚀 Mail Gönderici Motoru Kurulumu
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.config.get('EMAIL_USER') || process.env.EMAIL_USER,
        pass: this.config.get('EMAIL_PASS') || process.env.EMAIL_PASS,
      },
    });
  }

  // KAYIT OLMA (Register) - MAİL ONAYLI SAAS SİSTEMİ
  async signup(dto: any) { 
    // Şifreyi argon2 ile hashle
    const hash = await argon.hash(dto.password);

    // 🚀 6 Haneli Rastgele Doğrulama Kodu Üret
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 🚀 30 Günlük Ücretsiz Deneme Süresini Hesapla
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);

    try {
      // Kullanıcıyı veritabanına kaydet (Fakat onaysız olarak)
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          hash,
          shopName: dto.shopName,
          plan: dto.plan || 'TRIAL', // Seçilen plan (Frontend'den gelecek)
          trialEndsAt: trialEnd,
          verificationCode: otp,
          isVerified: false, // 🚨 İlk başta onaysız!
        },
      });

      // 🚀 MAİLİ GÖNDER
      await this.transporter.sendMail({
        from: `"Konca SaaS" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Konca SaaS - E-Posta Doğrulama Kodu',
        html: `
          <div style="font-family: Arial, sans-serif; text-align: center; padding: 30px; background-color: #171717; color: #fff; border-radius: 15px;">
            <h2 style="color: #f59e0b;">Aramıza Hoş Geldiniz! 🚀</h2>
            <p style="font-size: 16px; color: #d1d5db;">Kuaför salonunuzu dijitale taşımanıza çok az kaldı. Hesabınızı aktifleştirmek için aşağıdaki doğrulama kodunu kullanın:</p>
            <div style="margin: 30px auto; padding: 15px; background-color: #0a0a0a; border: 2px dashed #f59e0b; width: fit-content; border-radius: 10px;">
              <h1 style="color: #f59e0b; font-size: 48px; letter-spacing: 10px; margin: 0;">${otp}</h1>
            </div>
            <p style="color: #9ca3af; font-size: 14px;">Bu kod 30 günlük ücretsiz deneme sürenizi de başlatacaktır.</p>
          </div>
        `,
      });

      // Token DÖNMÜYORUZ, çünkü henüz kodu girmedi. Başarı mesajı dönüyoruz.
      return { message: 'Doğrulama kodu gönderildi', email: user.email };
      
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ForbiddenException('Bu e-posta zaten kullanımda');
      }
      throw error;
    }
  }

  // 🚀 KOD DOĞRULAMA (Verify Email)
  async verifyEmail(dto: any) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new ForbiddenException('Kullanıcı bulunamadı.');
    
    // Kod eşleşiyor mu kontrol et
    if (user.verificationCode !== dto.code) {
      throw new ForbiddenException('Hatalı veya süresi dolmuş kod girdiniz.');
    }

    // Kodu doğru girdiyse hesabı aktifleştir ve kodu temizle
    const updatedUser = await this.prisma.user.update({
      where: { email: dto.email },
      data: { isVerified: true, verificationCode: null },
    });

    // Artık onaylandığı için giriş token'ını verebiliriz
    return this.signToken(updatedUser.id, updatedUser.email);
  }

  // GİRİŞ YAPMA (Login)
  async signin(dto: AuthDto) {
    // Kullanıcıyı bul
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!user) throw new ForbiddenException('Hatalı giriş bilgileri');

    // Şifreyi argon2 ile kontrol et
    const pwMatches = await argon.verify(user.hash, dto.password);
    if (!pwMatches) throw new ForbiddenException('Hatalı giriş bilgileri');

    // 🚨 MAİL ONAYI YOKSA GİRİŞE İZİN VERME
    if (!user.isVerified) {
      throw new ForbiddenException('Lütfen önce e-posta adresinizi doğrulayın.');
    }

    return this.signToken(user.id, user.email);
  }

  // TOKEN OLUŞTURMA
  async signToken(userId: number, email: string): Promise<{ access_token: string }> {
    const payload = {
      sub: userId,
      email,
    };
    const secret = this.config.get('JWT_SECRET');

    const token = await this.jwt.signAsync(payload, {
      expiresIn: '15d',
      secret: secret,
    });

    return {
      access_token: token,
    };
  }
}