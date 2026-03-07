import { Module } from '@nestjs/common';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';
import { PrismaModule } from '../prisma/prisma.module';
// 🚀 DİKKAT: Aşağıdaki yol senin projende farklı olabilir. 
// VS Code'da NotificationService yazıp Enter'a basarsan otomatik doğru yolu (import) ekleyecektir.
import { NotificationService } from '../notification/notification.service'; 

@Module({
  imports: [PrismaModule],
  controllers: [AppointmentController],
  providers: [
    AppointmentService, 
    NotificationService // 🚀 İŞTE EKSİK OLAN PARÇA BURASIYDI!
  ],
})
export class AppointmentModule {}