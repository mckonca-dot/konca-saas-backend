import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { ServiceModule } from './service/service.module';
import { CustomerModule } from './customer/customer.module';
import { AppointmentModule } from './appointment/appointment.module';
import { PublicModule } from './public/public.module'; 
import { NotificationModule } from './notification/notification.module';
import { StaffModule } from './staff/staff.module'; 
import { ReviewModule } from './review/review.module'; 
import { GalleryModule } from './gallery/gallery.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UserModule,
    PrismaModule,
    ServiceModule,
    CustomerModule,
    AppointmentModule,
    PublicModule, 
    NotificationModule,
    StaffModule,
    ReviewModule,
    GalleryModule, 
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}