import { Controller, Get, Post, Body, Param, Query, Header } from '@nestjs/common';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  // 🌍 TÜM DÜKKANLAR (VİTRİN)
  @Get('shops')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  getAllShops() {
    return this.publicService.getAllPublicShops();
  }

  // 🗺️ SEO İÇİN: TÜM DÜKKAN SLUGLARINI GETİR (Sitemap için)
  // Bu endpoint frontend'deki sitemap.ts tarafından kullanılacak
  @Get('shops/all-slugs')
  getAllShopSlugs() {
    return this.publicService.getAllShopSlugs();
  }

  // 🚀 SEO İÇİN ASIL BOMBA: SLUG İLE DÜKKAN GETİR
  // Örnek: /public/shop/by-slug/ahmet-kuafor-duzce
  @Get('shop/by-slug/:slug')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate')
  getShopBySlug(@Param('slug') slug: string) {
    return this.publicService.getShopBySlug(slug);
  }

  // MEVCUT ID BAZLI GETİRME (Eski linkler bozulmasın diye kalsın)
  @Get('shop/:userId')
  getShop(@Param('userId') userId: string) {
    return this.publicService.getShopData(Number(userId));
  }

  // HİZMETLER (Slug desteği eklenebilir veya ID üzerinden devam edebilir)
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

  @Get('reviews/:userId')
  async getReviews(@Param('userId') userId: string) {
    return this.publicService.getGoogleReviews(Number(userId));
  }

  @Get('appointments/:userId')
  getAppointments(
    @Param('userId') userId: string,
    @Query('date') date: string
  ) {
    return this.publicService.getAppointmentsByDate(Number(userId), date);
  }

  @Get('shops/:city') // Sadece şehir gelirse
  @Get('shops/:city/:district') // Şehir ve ilçe gelirse
  getShopsByLocation(
    @Param('city') city: string,
    @Param('district') district?: string // Soru işareti burada kalabilir (kod içinde opsiyonel olması için)
  ) {
    return this.publicService.getShopsByLocation(city, district);
  }

  // Bunu Controller sınıfının içine uygun bir yere (örneğin getReviews'un altına) yapıştır:
  @Get('blog/:slug')
  getBlogPost(@Param('slug') slug: string) {
    return this.publicService.getBlogPost(slug);
  }

  @Post('appointments')
  bookAppointment(@Body() body: any) {
    // shopId hala veritabanı ID'si olmalı
    return this.publicService.createPublicAppointment(Number(body.shopId), body);
  }
}