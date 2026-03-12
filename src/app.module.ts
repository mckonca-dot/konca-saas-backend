import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { ServiceModule } from './service/service.module';
import { AppointmentModule } from './appointment/appointment.module';
import { StaffModule } from './staff/staff.module';
import { CustomerModule } from './customer/customer.module';
import { NotificationModule } from './notification/notification.module';
import { ChatModule } from './chat/chat.module';
import { GalleryModule } from './gallery/gallery.module';
import { PublicModule } from './public/public.module';
import { AdminModule } from './admin/admin.module';
import { SubscriptionTaskService } from './tasks/subscription-task.service';
import { PaymentModule } from './payment/payment.module';

// 🛡️ GÜVENLİK İÇİN EKLENEN İMPORTLAR (ANTI-DDOS)
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    
    // 🛑 ANTI-DDOS VE SPAM KALKANI (Throttler)
    // 1 dakika (60000 milisaniye) içinde aynı IP adresinden en fazla 100 isteğe izin verir.
    // Limiti aşanlar otomatik olarak engellenir.
    ThrottlerModule.forRoot([{
      ttl: 60000, 
      limit: 100, 
    }]),

    AuthModule,
    UserModule,
    PrismaModule,
    ServiceModule,
    AppointmentModule,
    StaffModule,
    CustomerModule,
    NotificationModule,
    ChatModule,
    GalleryModule,
    PublicModule,
    AdminModule,
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    SubscriptionTaskService,
    
    // 🛡️ Kalkanı tüm sisteme (Global) uyguluyoruz
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}