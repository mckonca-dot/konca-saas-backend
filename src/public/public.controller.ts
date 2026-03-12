import { Controller, Get, Post, Body, Param, Query, Header } from '@nestjs/common';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  // 👇 YENİ: Ana sayfa vitrini için tüm dükkanları getiren endpoint
  // 🚀 GÜVENLİK: Backend seviyesinde de "Cache (Önbellek)" tamamen kapatıldı!
  @Get('shops')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  getAllShops() {
    return this.publicService.getAllPublicShops();
  }

  @Get('shop/:userId')
  getShop(@Param('userId') userId: string) {
    return this.publicService.getShopData(Number(userId));
  }

  @Get('services/:userId')
  async getServices(@Param('userId') userId: string) {
    const data = await this.publicService.getShopData(Number(userId)) as any;
    return data.services || [];
  }

  @Get('staffs/:userId')
  async getStaffs(@Param('userId') userId: string) {
    const data = await this.publicService.getShopData(Number(userId)) as any;
    return data.staff || [];
  }

  @Get('closures/:userId')
  getClosures(@Param('userId') userId: string) {
    return this.publicService.getClosures(Number(userId));
  }

  @Get('leaves/:userId')
  getLeaves(@Param('userId') userId: string) {
    return this.publicService.getLeaves(Number(userId));
  }

  @Get('gallery/:userId')
  getGallery(@Param('userId') userId: string) {
    return this.publicService.getGallery(Number(userId));
  }

  // 👇 YENİ: Google Haritalar Yorumlarını Çeken Endpoint
  @Get('reviews/:userId')
  async getReviews(@Param('userId') userId: string) {
    // Boş dizi yerine artık PublicService'teki zeki motoru çağırıyoruz!
    return this.publicService.getGoogleReviews(Number(userId));
  }

  // 👇 YENİ: Dolu Randevuları Çeken Endpoint
  // Örnek: /public/appointments/1?date=2026-01-14
  @Get('appointments/:userId')
  getAppointments(
    @Param('userId') userId: string,
    @Query('date') date: string
  ) {
    return this.publicService.getAppointmentsByDate(Number(userId), date);
  }

  @Post('appointments')
  bookAppointment(@Body() body: any) {
    return this.publicService.createPublicAppointment(Number(body.shopId), body);
  }
}