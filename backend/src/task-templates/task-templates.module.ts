import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskTemplatesService } from './task-templates.service';
import { TaskTemplatesController } from './task-templates.controller';
import { TaskTemplate } from '../database/entities/task-template.entity';
import { Task } from '../database/entities/task.entity';
import { UserGroup } from '../database/entities/user-group.entity';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskTemplate, Task, UserGroup]),
    TasksModule,
  ],
  controllers: [TaskTemplatesController],
  providers: [TaskTemplatesService],
  exports: [TaskTemplatesService],
})
export class TaskTemplatesModule {}
