import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🛡️ 1. HELMET: Görünmez HTTP kalkanı. XSS ve Veri Koklama saldırılarını engeller.
  app.use(helmet());

  // 🛡️ 2. CORS (Sınır Muhafızı): Sadece bizim izin verdiğimiz siteler backend'e bağlanabilir!
  // NOT: İleride kendi domainini (berberim.com) aldığında buraya ekleyeceğiz. 
  // Şimdilik Localhost ve Vercel/Netlify için esnek bırakıyoruz.
  app.enableCors({
    origin: ['http://localhost:3000', '*', /\.vercel\.app$/], // Tüm Vercel sitelerine ve locale açık
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // 🛡️ 3. VERİ GÜMRÜĞÜ (Validation & Sanitization): 
  // Dışarıdan gelen verilerde bizim beklemediğimiz (zararlı) bir kod varsa çöpe atar.
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Şemada olmayan gizli verileri siler
    forbidNonWhitelisted: false, // Şemada olmayan veri gelirse uyarı verir
    transform: true, // Gelen veriyi doğru tipe (String/Int) zorla çevirir
  }));

  await app.listen(process.env.PORT || 3001);
  console.log(`🛡️ KALE KAPILARI MÜHÜRLENDİ! Sunucu ${process.env.PORT || 3001} portunda çalışıyor.`);
}
bootstrap();