import { IsArray, IsEnum, IsUUID } from 'class-validator';
import { TaskStatus } from '../../database/entities/task.entity';

export class BulkUpdateStatusDto {
  @IsArray()
  @IsUUID('all', { each: true })
  taskIds: string[];

  @IsEnum(TaskStatus)
  status: TaskStatus;
}
