import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsArray } from 'class-validator';

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
    access_token: string;
    user: {
        id: string;
        email: string;
        name: string;
        skills?: string[];
        webTheme?: string;
        mobileTheme?: string;
    };
}
