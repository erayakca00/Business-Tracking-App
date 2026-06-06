import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { dataSourceOptions } from './database/data-source';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GroupsModule } from './groups/groups.module';
import { TasksModule } from './tasks/tasks.module';
import { CommentsModule } from './comments/comments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { SprintsModule } from './sprints/sprints.module';
import { EventsModule } from './events/events.module';
import { MailModule } from './mail/mail.module';
import { InvitationsModule } from './invitations/invitations.module';
import { TaskTemplatesModule } from './task-templates/task-templates.module';
import { validate } from './config.schema';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { XssSanitizerMiddleware } from './common/middleware/xss-sanitizer.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    ScheduleModule.forRoot(),

    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),
    AuthModule,
    UsersModule,
    GroupsModule,
    TasksModule,
    CommentsModule,
    NotificationsModule,
    AttachmentsModule,
    SprintsModule,
    EventsModule,
    MailModule,
    InvitationsModule,
    TaskTemplatesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware, XssSanitizerMiddleware).forRoutes('*');
  }
}
