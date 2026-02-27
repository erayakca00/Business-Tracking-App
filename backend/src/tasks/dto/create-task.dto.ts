import { IsNotEmpty, IsString, IsOptional, IsUUID, IsEnum, Matches } from 'class-validator';
import { TaskPriority } from '../../database/entities/task.entity';

export class CreateTaskDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsUUID()
    @IsNotEmpty()
    groupId: string;

    @IsUUID()
    @IsOptional()
    assignedToId?: string;

    @IsEnum(TaskPriority)
    @IsOptional()
    priority?: TaskPriority;

    @IsOptional()
    dueDate?: Date;

    @IsString()
    @IsOptional()
    @Matches(/^[A-Z]{3}-\d+$/, { message: 'Tag must be in format ABC-1 (3 uppercase letters, dash, number)' })
    projectTag?: string;
}
