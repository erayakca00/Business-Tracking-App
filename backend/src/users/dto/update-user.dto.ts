import { IsEmail, IsOptional, IsString, IsArray } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  skills?: string[];

  @IsOptional()
  @IsString()
  password?: string;
}
