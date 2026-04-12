// src/auth/dto/auth.dto.ts
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AuthDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string; // 🎯 '!' ekledik

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string; // 🎯 '!' ekledik

  @IsString()
  @IsNotEmpty()
  fullName!: string; // 🎯 '!' ekledik

  @IsString()
  @IsNotEmpty()
  shopName!: string; // 🎯 '!' ekledik

  @IsString()
  @IsNotEmpty()
  category!: string; // 🎯 '!' ekledik
}