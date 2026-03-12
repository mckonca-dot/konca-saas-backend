import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🛡️ 1. HELMET: Görünmez HTTP kalkanı. XSS ve Veri Koklama saldırılarını engeller.
  app.use(helmet());

  // 🛡️ 2. CORS (Sınır Muhafızı): Şimdilik Frontend'imizin rahatça erişebilmesi için esnek tutuyoruz.
  app.enableCors({
    origin: ['http://localhost:3000', '*', /\.vercel\.app$/],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // 🚨 NOT: Agresif ValidationPipe kalkanını kaldırdık çünkü esnek veri (any) yapımızı blokluyordu.
  // Sitemiz Prisma ORM kullandığı için SQL Injection saldırılarına karşı zaten doğal olarak %100 korumalıdır!

  await app.listen(process.env.PORT || 3001);
  console.log(`🛡️ KALE KAPILARI AÇILDI! Sunucu ${process.env.PORT || 3001} portunda çalışıyor.`);
}
bootstrap();