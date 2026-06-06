import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { TaskPriority } from '../../database/entities/task.entity';

export class CreateTaskTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  effort?: number;

  @IsString()
  @IsOptional()
  projectTag?: string;

  @IsUUID()
  @IsOptional()
  taskId?: string;
}
