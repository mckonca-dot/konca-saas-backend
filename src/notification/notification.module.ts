import { Global, Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller'; 
import { HttpModule } from '@nestjs/axios';
import { ReminderService } from './reminder.service';

@Global() // Global yapıyoruz ki her yerden (randevu servisinden vs.) kolayca çağıralım
@Module({
  imports: [HttpModule],
  controllers: [NotificationController], // 👈 YENİ: Dışarı açılan kapıyı NestJS'e tanıttık
  providers: [NotificationService, ReminderService],
  exports: [NotificationService],
})
export class NotificationModule {}