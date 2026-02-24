import { Global, Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller'; // 👈 YENİ: Controller'ı import ettik
import { HttpModule } from '@nestjs/axios';

@Global() // Global yapıyoruz ki her yerden (randevu servisinden vs.) kolayca çağıralım
@Module({
  imports: [HttpModule],
  controllers: [NotificationController], // 👈 YENİ: Dışarı açılan kapıyı NestJS'e tanıttık
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}