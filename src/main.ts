import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express'; 

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. CORS'u Aç (Frontend'in Backend'e sorunsuz erişmesi için GÜNCELLENDİ)
  app.enableCors({
    origin: '*', // Şimdilik tüm adreslerden gelen isteklere kapıyı açıyoruz
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // 2. Doğrulama Borusu (Login/Register DTO'larının çalışması için)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // DTO'da olmayan fazlalık verileri otomatik temizler
  }));

  // 3. --- RESİM YÜKLEME AYARI (Base64 Payload Limit) ---
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // 4. Sunucuyu Başlat (RENDER İÇİN GÜNCELLENDİ)
  // Render'ın atadığı portu kullan, bulamazsa 3001'i kullan
  await app.listen(process.env.PORT || 3001);
}
bootstrap();