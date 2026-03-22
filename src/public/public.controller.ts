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
  @Get('shops/all-slugs')
  getAllShopSlugs() {
    return this.publicService.getAllShopSlugs();
  }

  // 🚀 SEO İÇİN ASIL BOMBA: SLUG VEYA ID İLE DÜKKAN GETİR
  // Frontend artık /public/shop/ahmet-kuafor şeklinde istek atıyor
  @Get('shop/:identifier')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate')
  async getShop(@Param('identifier') identifier: string) {
    // 🧠 ZEKİ KONTROL: Eğer gelen parametre sadece rakamlardan oluşuyorsa ID'dir, yoksa SLUG'dır.
    const isId = /^\d+$/.test(identifier);

    if (isId) {
      // Eskisi gibi ID ile arama
      return this.publicService.getShopData(Number(identifier));
    } else {
      // Yeni nesil SLUG ile arama
      return this.publicService.getShopBySlug(identifier);
    }
  }

  // HİZMETLER 
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

  // ŞEHİR VE İLÇE FİLTRESİ
  @Get('shops/:city') 
  @Get('shops/:city/:district') 
  getShopsByLocation(
    @Param('city') city: string,
    @Param('district') district?: string 
  ) {
    return this.publicService.getShopsByLocation(city, district);
  }

  // BLOG
  @Get('blog/:slug')
  getBlogPost(@Param('slug') slug: string) {
    return this.publicService.getBlogPost(slug);
  }

  // RANDEVU OLUŞTURMA
  @Post('appointments')
  bookAppointment(@Body() body: any) {
    // shopId hala veritabanı ID'si olmalı
    return this.publicService.createPublicAppointment(Number(body.shopId), body);
  }
}