import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { Task } from '../database/entities/task.entity';
import { Group } from '../database/entities/group.entity';
import { UserGroup } from '../database/entities/user-group.entity';
import { TaskActivity } from '../database/entities/task-activity.entity';
import { TimeLog } from '../database/entities/time-log.entity';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventsModule } from '../events/events.module';
import { AiModule } from '../ai/ai.module';
import { CommentsModule } from '../comments/comments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Group, UserGroup, TaskActivity, TimeLog]),
    UsersModule,
    NotificationsModule,
    EventsModule,
    AiModule,
    CommentsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
