import { Controller, Post, Get, Delete, Patch, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ServiceService } from './service.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('services')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.serviceService.createService(req.user.id, body);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.serviceService.getServices(req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.serviceService.deleteService(+id, req.user.id);
  }

  // GÜNCELLEME ENDPOINT'İ (YENİ)
  @Patch(':id')
  update(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    return this.serviceService.updateService(+id, req.user.id, body);
  }
}