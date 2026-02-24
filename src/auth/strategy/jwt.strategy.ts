import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: number; email: string }) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
    });

    // ÇÖZÜM 1: Eğer kullanıcı bulunamazsa 'null' döndür.
    // Bu sayede TypeScript, aşağıdaki satırlarda user'ın null olmadığından emin olur.
    if (!user) {
      return null;
    }

    // ÇÖZÜM 2: TypeScript'e "Sen karışma, ben ne yaptığımı biliyorum" demek için
    // 'as any' kullanıyoruz. Böylece 'hash' alanını silmemize izin veriyor.
    delete (user as any).hash;

    return user;
  }
}