import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller'; // 🚀 Doğru isimle import et
import { NotificationService } from './notification.service';

@Module({
  controllers: [NotificationController], // 🚀 Buraya dikkat!
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}