import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';

@Injectable()
export class ChatService {
  private openai: OpenAI;

  constructor(private prisma: PrismaService) {
    // NOT: Gerçek projede API Key'i .env dosyasından almalısın!
    this.openai = new OpenAI({
      apiKey: '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', // <-- Kendi Key'ini buraya yapıştır
    });
  }

  async askAssistant(userId: number, userMessage: string) {
    // 1. Dükkanın tüm verilerini çekelim (AI'yı eğitmek için)
    const shop = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        services: true,
        staff: true,
        closures: true, // Kapalı günleri de bilsin
      },
    });

    if (!shop) return { reply: "Dükkan bulunamadı." };

    // 2. AI için "Sistem Kimliği" (Context) oluşturalım
    const serviceList = shop.services
      .filter(s => s.isActive)
      .map(s => `- ${s.name}: ${s.price} TL (${s.duration} dk)`)
      .join('\n');

    const staffList = shop.staff.map(s => s.name).join(', ');
    
    const workHours = `Açılış: ${shop.workStart}, Kapanış: ${shop.workEnd}`;

    const systemPrompt = `
      Sen "${shop.shopName || 'Kuaför'}" adlı işletmenin yapay zeka asistanısın.
      Çok kibar, yardımsever ve kısa cevaplar ver. Türkçe konuş.
      
      İŞLETME BİLGİLERİ:
      - Çalışma Saatleri: ${workHours}
      - Personellerimiz: ${staffList}
      - Adres/Telefon: ${shop.phone || 'Sitede mevcut'}
      
      HİZMETLERİMİZ VE FİYATLAR:
      ${serviceList}

      KURALLAR:
      1. Sadece yukarıdaki bilgilere dayanarak cevap ver.
      2. Eğer müşteri randevu almak isterse, "Lütfen yukarıdaki takvimden size uygun saati seçerek randevu oluşturun" de.
      3. Fiyat sorulursa listedeki fiyatı söyle.
    `;

    // 3. ChatGPT'ye soruyu gönder
    try {
      const completion = await this.openai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        model: 'gpt-3.5-turbo', // Hızlı ve ekonomik model
      });

      return { reply: completion.choices[0].message.content };
    } catch (error) {
      console.error("AI Hatası:", error);
      return { reply: "Şu an bağlantıda bir sorun var, ancak randevunuzu yukarıdan manuel alabilirsiniz." };
    }
  }
}