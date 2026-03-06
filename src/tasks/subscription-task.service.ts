import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionTaskService {
  private readonly logger = new Logger(SubscriptionTaskService.name);

  constructor(private prisma: PrismaService) {}

  // 🚀 HER GECE SAAT 00:00'DA ÇALIŞIR
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleSubscriptionCheck() {
    this.logger.log('Abonelik kontrolleri başlatılıyor...');

    const now = new Date();

    // 1. Süresi biten dükkanları bul ve pasif yap
    // (Hem deneme süresi bitenler hem de normal aboneliği bitenler)
    const expiredShops = await this.prisma.user.updateMany({
      where: {
        isActive: true,
        isAdmin: false, // Admin dükkanı asla kapanmaz
        OR: [
          {
            plan: 'TRIAL',
            trialEndsAt: { lt: now },
          },
          {
            plan: { not: 'TRIAL' },
            subscriptionEnd: { lt: now },
          }
        ]
      },
      data: {
        isActive: false // 🚨 Işıkları söndür
      }
    });

    if (expiredShops.count > 0) {
      this.logger.warn(`${expiredShops.count} dükkanın süresi dolduğu için pasife alındı.`);
    } else {
      this.logger.log('Süresi dolan dükkan bulunamadı.');
    }
  }
}