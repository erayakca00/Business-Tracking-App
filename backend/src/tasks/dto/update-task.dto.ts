import {
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  ValidateIf,
  Matches,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { TaskStatus, TaskPriority } from '../../database/entities/task.entity';

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ValidateIf((object, value) => value !== null)
  @IsUUID()
  @IsOptional()
  assignedToId?: string | null;

  @IsOptional()
  dueDate?: Date;

  @IsString()
  @IsOptional()
  @Matches(/^[A-Z]{3}-\d+$/, {
    message: 'Tag must be in format ABC-1 (3 uppercase letters, dash, number)',
  })
  projectTag?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  effort?: number;

  @IsOptional()
  sprintId?: string | null;

  @IsString()
  @IsOptional()
  dependsOnId?: string | null;
}
