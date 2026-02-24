import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

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

  @Get('reviews/:userId')
  getReviews() { return []; } 

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