import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { Group } from '../database/entities/group.entity';
import { UserGroup } from '../database/entities/user-group.entity';
import { UsersModule } from '../users/users.module';
import { Task } from '../database/entities/task.entity';
import { TimeLog } from '../database/entities/time-log.entity';
import { SprintsModule } from '../sprints/sprints.module';
import { InvitationsModule } from '../invitations/invitations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, UserGroup, Task, TimeLog]),
    UsersModule,
    SprintsModule,
    InvitationsModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
})
export class GroupsModule {}
