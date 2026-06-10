import { IsEnum } from 'class-validator';
import { UserRole } from '../../database/entities/user-group.entity';

export class UpdateMemberRoleDto {
  @IsEnum(UserRole, { message: 'role must be either admin or member' })
  role: UserRole;
}
