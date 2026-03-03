import { Controller, Get, Patch, Delete, Param, Body } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin')
export class AdminController {
  constructor(private prisma: PrismaService) {}

  @Get('dashboard')
  async getAdminStats() {
    const shops = await this.prisma.user.findMany({
      where: { isAdmin: false },
      include: {
        _count: { select: { appointments: true } },
        appointments: { select: { service: { select: { price: true } } } }
      }
    });

    return shops.map(shop => ({
      id: shop.id,
      shopName: shop.shopName,
      email: shop.email,
      city: shop.city,
      isPromoted: shop.isPromoted,
      isActive: shop.isActive,
      totalAppointments: shop._count.appointments,
      totalEarnings: shop.appointments.reduce((sum, app) => sum + Number(app.service?.price || 0), 0)
    }));
  }

  @Patch('shop/:id')
  updateShopStatus(@Param('id') id: string, @Body() data: any) {
    return this.prisma.user.update({
      where: { id: Number(id) },
      data: { isActive: data.isActive, isPromoted: data.isPromoted }
    });
  }

  @Delete('shop/:id')
  deleteShop(@Param('id') id: string) {
    return this.prisma.user.delete({ where: { id: Number(id) } });
  }
}