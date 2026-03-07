import { Controller, Get, Patch, Delete, Param, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(AuthGuard('jwt'))
@Controller('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private prisma: PrismaService
  ) {}

  // 🛡️ Sadece Süper Adminlerin Girmesini Sağlayan Güvenlik Kilidi
  private async checkAdmin(req: any) {
    const user = await this.prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !user.isAdmin) throw new ForbiddenException('Bu işlem için yetkiniz yok.');
  }

  @Get('dashboard')
  async getDashboard(@Request() req) {
    await this.checkAdmin(req);
    return this.adminService.getDashboard();
  }

  @Patch('shop/:id')
  async updateShop(@Request() req, @Param('id') id: string, @Body() data: any) {
    await this.checkAdmin(req);
    return this.adminService.updateShop(Number(id), data);
  }

  @Delete('shop/:id')
  async deleteShop(@Request() req, @Param('id') id: string) {
    await this.checkAdmin(req);
    return this.adminService.deleteShop(Number(id));
  }
}