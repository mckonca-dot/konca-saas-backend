import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthDto } from './dto';
import * as argon from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // KAYIT OLMA (Register)
  async signup(dto: any) { // dto tipini any yaptık ki shopName gelebilsin
    // Şifreyi hashle
    const hash = await argon.hash(dto.password);

    try {
      // Kullanıcıyı kaydet
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          hash,
          shopName: dto.shopName, // <-- ARTIK DÜKKAN ADINI DA KAYDEDİYORUZ
        },
      });

      return this.signToken(user.id, user.email);
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ForbiddenException('Bu e-posta zaten kullanımda');
      }
      throw error;
    }
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

    // Şifreyi kontrol et
    const pwMatches = await argon.verify(user.hash, dto.password);
    if (!pwMatches) throw new ForbiddenException('Hatalı giriş bilgileri');

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