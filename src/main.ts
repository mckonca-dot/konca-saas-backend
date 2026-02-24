import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express'; 

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. CORS'u Aç (Frontend'in Backend'e erişmesi için şart)
  app.enableCors();

  // 2. Doğrulama Borusu (Login/Register DTO'larının çalışması için)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // DTO'da olmayan fazlalık verileri otomatik temizler
  }));

  // 3. --- RESİM YÜKLEME AYARI (Base64 Payload Limit) ---
  // Varsayılan limit 100kb'dır. Bunu artırmazsak resim yüklerken hata alırsın.
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // 4. Sunucuyu 3001 Portunda Başlat
  await app.listen(3001);
}
bootstrap();