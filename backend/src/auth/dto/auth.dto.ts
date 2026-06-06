import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsArray,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @IsOptional()
  skills?: string[];
}

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class AuthResponseDto {
  @IsString()
  @IsOptional()
  access_token?: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsOptional()
  user?: {
    id: string;
    email: string;
    name: string;
    skills?: string[];
    webTheme?: string;
    mobileTheme?: string;
  };
}

export class ForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;
}
