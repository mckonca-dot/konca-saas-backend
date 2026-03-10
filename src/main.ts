import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express'; // 🚀 Express yardımcılarını ekledik

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🔥 SİHİRLİ DOKUNUŞ: Sunucunun veri taşıma kapasitesini 10MB'a çıkarıyoruz
  // Bu ayar sayesinde logolar yüklenirken oluşan "413 Payload Too Large" hatası çözülür.
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // 🛡️ SİBER GÜVENLİK KALKANI (CORS) - Mevcut ayarlarını harfiyen koruyoruz
  app.enableCors({
    origin: [
      'http://localhost:3000', 
      'https://randevu-saas-frontend-ghqr.vercel.app', 
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, 
  });

  // Render'ın atadığı portu veya 3001'i dinle
  await app.listen(process.env.PORT || 3001);
}
bootstrap();