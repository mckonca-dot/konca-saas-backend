import { Module } from '@nestjs/common';
import { PublicService } from './public.service';
import { PublicController } from './public.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [PublicController],
  providers: [PublicService, PrismaService],
})
export class PublicModule {}