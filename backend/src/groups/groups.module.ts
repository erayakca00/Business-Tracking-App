import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { Group } from '../database/entities/group.entity';
import { UserGroup } from '../database/entities/user-group.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, UserGroup]),
    UsersModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
})
export class GroupsModule { }
