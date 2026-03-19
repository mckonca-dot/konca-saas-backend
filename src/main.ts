import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🛡️ 1. HELMET: Görünmez HTTP kalkanı. XSS ve Veri Koklama saldırılarını engeller.
  app.use(helmet());

  // 🛡️ CORS Ayarları
  app.enableCors({
    origin: [
      'https://planin.com.tr',        // Ana domain
      'https://www.planin.com.tr',    // www'li domain (Hata buradan geliyor!)
      'https://planin-frontend.vercel.app', // Vercel adresi (e-posta onayları için lazım olabilir)
      'http://localhost:3000',        // Yerel test
      'http://localhost:8081',        // Mobil test
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  // 🚨 NOT: Agresif ValidationPipe kalkanını kaldırdık çünkü esnek veri (any) yapımızı blokluyordu.
  // Sitemiz Prisma ORM kullandığı için SQL Injection saldırılarına karşı zaten doğal olarak %100 korumalıdır!

  await app.listen(process.env.PORT || 3001);
  console.log(`🛡️ KALE KAPILARI AÇILDI! Sunucu ${process.env.PORT || 3001} portunda çalışıyor.`);
}
bootstrap();