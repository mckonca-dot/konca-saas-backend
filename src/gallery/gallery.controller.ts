import { Controller, Get, Post, Body, Param, Delete, Request, UseGuards } from '@nestjs/common';
import { GalleryService } from './gallery.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('gallery')
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Request() req, @Body() body: { image: string; modelName?: string }) {
    // Frontend'den gelen 'modelName' bilgisini de iletiyoruz
    return this.galleryService.create(req.user.id, body.image, body.modelName);
  }

  // Dükkan sahibinin kendi galerisini görmesi için
  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(@Request() req) {
    return this.galleryService.findAll(req.user.id);
  }

  // Public (Müşteri) tarafı için galeri (Opsiyonel, PublicController'da da olabilir)
  @Get(':userId')
  findPublic(@Param('userId') userId: string) {
    return this.galleryService.findAll(Number(userId));
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.galleryService.remove(Number(id), req.user.id);
  }
}