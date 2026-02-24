import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { AuthGuard } from '@nestjs/passport';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // ==========================================
  // 1. DÜKKAN KAPALI GÜNLER (CLOSURES)
  // ==========================================

  @UseGuards(AuthGuard('jwt'))
  @Get('closures')
  async getClosures(@Request() req) {
    return this.prisma.shopClosure.findMany({
      where: { userId: req.user.id },
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('closures')
  async addClosure(@Request() req, @Body() body: { date: string; reason: string }) {
    return this.prisma.shopClosure.create({
      data: {
        date: body.date,
        reason: body.reason,
        userId: req.user.id,
      },
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('closures/:id')
  async deleteClosure(@Request() req, @Param('id') id: string) {
    // Sadece kendi dükkanına ait kaydı silebilir
    return this.prisma.shopClosure.deleteMany({
      where: {
        id: Number(id),
        userId: req.user.id, 
      },
    });
  }

  // ==========================================
  // 2. PERSONEL İZİNLERİ (LEAVES)
  // ==========================================

  @UseGuards(AuthGuard('jwt'))
  @Get('leaves')
  async getLeaves(@Request() req) {
    // 1. Bu dükkana ait personelleri bul
    const myStaffs = await this.prisma.staff.findMany({
      where: { userId: req.user.id },
      select: { id: true }
    });
    
    // Eğer hiç personel yoksa boş dizi dön
    if (myStaffs.length === 0) return [];

    const staffIds = myStaffs.map(s => s.id);

    // 2. Bu personellere ait izinleri getir
    return this.prisma.staffLeave.findMany({
      where: { staffId: { in: staffIds } },
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('leaves')
  async addLeave(@Request() req, @Body() body: { staffId: string; date: string }) {
    const staffIdNum = Number(body.staffId);

    // Güvenlik: İzin eklenen personel gerçekten bu dükkanın mı?
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffIdNum, userId: req.user.id },
    });

    if (!staff) {
      throw new Error("Yetkisiz işlem: Bu personel size ait değil.");
    }

    return this.prisma.staffLeave.create({
      data: {
        staffId: staffIdNum,
        date: body.date,
      },
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('leaves/:id')
  async deleteLeave(@Param('id') id: string) {
    return this.prisma.staffLeave.delete({
      where: { id: Number(id) },
    });
  }
  // ==========================================================
  // 3. MÜŞTERİLER İÇİN GENEL VERİ ÇEKME (Şifresiz / Public)
  // ==========================================================

  // Müşteri ekranı için dükkanın kapalı günlerini getirir
  @Get('public-closures/:userId')
  async getPublicClosures(@Param('userId') userId: string) {
    return this.prisma.shopClosure.findMany({
      where: { userId: Number(userId) },
    });
  }

  // Müşteri ekranı için personelin izinlerini getirir
  @Get('public-leaves/:userId')
  async getPublicLeaves(@Param('userId') userId: string) {
    // 1. O dükkanın personellerini bul
    const myStaffs = await this.prisma.staff.findMany({
      where: { userId: Number(userId) },
      select: { id: true }
    });
    
    if (myStaffs.length === 0) return [];
    const staffIds = myStaffs.map(s => s.id);

    // 2. O personellerin izinlerini getir
    return this.prisma.staffLeave.findMany({
      where: { staffId: { in: staffIds } },
    });
  }
}