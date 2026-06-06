import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from '../database/entities/comment.entity';
import { Task } from '../database/entities/task.entity';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, Task]),
    NotificationsModule,
    UsersModule,
    EventsModule,
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
