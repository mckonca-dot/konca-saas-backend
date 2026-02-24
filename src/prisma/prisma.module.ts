import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Bu sayede her yerde tek tek import etmek zorunda kalmayacağız
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}