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
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { ChatModule } from './chat/chat.module';
import { GalleryModule } from './gallery/gallery.module';
import { PublicModule } from './public/public.module';
import { AdminModule } from './admin/admin.module';
import { SubscriptionTaskService } from './tasks/subscription-task.service';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    AuthModule,
    UserModule,
    PrismaModule,
    ServiceModule,
    AppointmentModule,
    StaffModule,
    CustomerModule,
    WhatsappModule,
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
  ],
})
export class AppModule {}