import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🛡️ SİBER GÜVENLİK KALKANI (CORS) - Sadece izinli siteler girebilir!
  app.enableCors({
    origin: [
      'http://localhost:3000', // Senin kendi bilgisayarın (geliştirme yaparken lazım)
      'https://randevu-saas-frontend-ghqr.vercel.app', // 👈 KENDİ VERCEL LİNKİNİ BURAYA YAPIŞTIR
      // İleride .com domaini alınca onu da buraya ekleyeceğiz.
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, // Oturum açma (token) işlemleri için şart
  });

  // Render'ın atadığı portu veya 3001'i dinle
  await app.listen(process.env.PORT || 3001);
}
bootstrap();