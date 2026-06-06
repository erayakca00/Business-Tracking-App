import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString({ message: 'Current Password must be a text string' })
  @MinLength(6, {
    message: 'Current Password must be at least 6 characters long',
  })
  currentPassword: string;

  @IsString({ message: 'New Password must be a text string' })
  @MinLength(6, { message: 'New Password must be at least 6 characters long' })
  newPassword: string;
}
