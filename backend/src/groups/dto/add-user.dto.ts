import { IsEmail, IsNotEmpty } from 'class-validator';

export class AddUserToGroupDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
