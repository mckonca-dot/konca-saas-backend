import { Controller, Post, Get, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { StaffService } from './staff.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('staffs')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.staffService.createStaff(req.user.id, body);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.staffService.getStaffs(req.user.id);
  }

  // 👇 İŞTE EKSİK OLAN PARÇA BU (GÜNCELLEME KAPISI) 👇
  @Patch(':id')
  update(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    // Frontend'den gelen id string olduğu için + işaretiyle sayıya çeviriyoruz
    return this.staffService.updateStaff(+id, req.user.id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.staffService.deleteStaff(+id, req.user.id);
  }
}