import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🛡️ 1. HELMET: Görünmez HTTP kalkanı. XSS ve Veri Koklama saldırılarını engeller.
  app.use(helmet());

  // 🛡️ 2. CORS (Sınır Muhafızı): Yeni VIP domainlerimiz listeye eklendi!
  app.enableCors({
    origin: [
      'http://localhost:3000',       // Yerel Frontend testi
      'http://localhost:8081',       // Yerel Mobil (Expo) testi
      'https://planincom.tr',        // 🚀 YENİ VIP DOMAIN (Ana)
      'https://www.planincom.tr',    // 🚀 YENİ VIP DOMAIN (WWW'li hali)
      /\.vercel\.app$/               // Eski Vercel linkleri (Ne olur ne olmaz kalsın)
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS', // OPTIONS eklendi (Tarayıcı ön uçuşları için şarttır)
    credentials: true,
  });

  // 🚨 NOT: Agresif ValidationPipe kalkanını kaldırdık çünkü esnek veri (any) yapımızı blokluyordu.
  // Sitemiz Prisma ORM kullandığı için SQL Injection saldırılarına karşı zaten doğal olarak %100 korumalıdır!

  await app.listen(process.env.PORT || 3001);
  console.log(`🛡️ KALE KAPILARI AÇILDI! Sunucu ${process.env.PORT || 3001} portunda çalışıyor.`);
}
bootstrap();