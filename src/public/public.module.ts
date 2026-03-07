import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { PrismaModule } from '../prisma/prisma.module';
// 🚀 DİKKAT: Aşağıdaki yol senin projende farklı olabilir. 
import { NotificationService } from '../notification/notification.service'; 

@Module({
  imports: [PrismaModule],
  controllers: [PublicController],
  providers: [
    PublicService, 
    NotificationService // 🚀 EKSİK PARÇAYI BURAYA DA EKLEDİK!
  ],
})
export class PublicModule {}