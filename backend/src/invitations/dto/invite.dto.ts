import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class InviteUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class AcceptInviteDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}
