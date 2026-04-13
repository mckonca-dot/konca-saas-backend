// src/auth/dto/auth.dto.ts
import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';

export class AuthDto {
  @IsEmail({}, { message: 'Lütfen geçerli bir e-posta adresi giriniz.' })
  @IsNotEmpty({ message: 'E-posta alanı boş bırakılamaz.' })
  email!: string; // 🎯 Giriş ve Kayıt için ZORUNLU

  @IsString()
  @IsNotEmpty({ message: 'Şifre alanı boş bırakılamaz.' })
  @MinLength(6, { message: 'Şifreniz en az 6 karakter olmalıdır.' })
  password!: string; // 🎯 Giriş ve Kayıt için ZORUNLU

  @IsString()
  @IsOptional()
  fullName?: string; // 🎯 Sadece kayıt olurken gelir, giriş yaparken aranmaz (?)

  @IsString()
  @IsOptional()
  shopName?: string; // 🎯 Sadece kayıt olurken gelir, giriş yaparken aranmaz (?)

  @IsString()
  @IsOptional()
  category?: string; // 🎯 Sadece kayıt olurken gelir, giriş yaparken aranmaz (?)
}