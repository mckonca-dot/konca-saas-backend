import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  // Constructor yok, adapter yok, sadece saf bağlantı.
  async onModuleInit() {
    await this.$connect();
  }
}