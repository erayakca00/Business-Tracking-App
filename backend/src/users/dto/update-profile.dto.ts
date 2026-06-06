import { IsString, MinLength, IsOptional } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  webTheme?: string;

  @IsString()
  @IsOptional()
  mobileTheme?: string;
}
