import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class AuthDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  shopName?: string;
}