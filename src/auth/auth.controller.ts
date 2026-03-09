import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // KAYIT OL (Register)
  @Post('signup')
  signup(@Body() dto: any) {
    return this.authService.signup(dto);
  }

  // 🚀 YENİ: E-POSTA DOĞRULAMA (OTP) ROTASI
  @HttpCode(HttpStatus.OK)
  @Post('verify')
  verifyEmail(@Body() dto: any) {
    return this.authService.verifyEmail(dto);
  }

  // GİRİŞ YAP (Login)
  @HttpCode(HttpStatus.OK)
  @Post('signin')
  signin(@Body() dto: AuthDto) {
    return this.authService.signin(dto);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: any) {
    return this.authService.resetPassword(body);
  }
}