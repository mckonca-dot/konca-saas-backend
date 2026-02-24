import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from './user.service';

@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Bilgilerimi Getir (DÜZELTİLDİ: Artık taze veri çekiyor)
  @Get('me')
  getMe(@Req() req: any) {
    // req.user sadece token içindeki eski bilgidir.
    // Biz veritabanından en güncelini istiyoruz:
    return this.userService.getUserById(req.user.id);
  }

  // Bilgilerimi Güncelle
  @Patch('me')
  editUser(@Req() req: any, @Body() body: any) {
    return this.userService.updateUser(req.user.id, body);
  }

  // Saatleri Güncelle
  @Patch('hours')
  updateHours(@Req() req: any, @Body() body: any) {
    // Frontend'den gelen veriyi kontrol edelim
    console.log("Gelen Saat Verisi:", body);
    return this.userService.updateWorkHours(req.user.id, body.workStart, body.workEnd);
  }
}