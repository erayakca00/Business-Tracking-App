import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvitationsService } from './invitations.service';
import { InvitationsController } from './invitations.controller';
import { Invitation } from '../database/entities/invitation.entity';
import { Group } from '../database/entities/group.entity';
import { UserGroup } from '../database/entities/user-group.entity';
import { User } from '../database/entities/user.entity';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invitation, Group, UserGroup, User]),
    MailModule,
  ],
  controllers: [InvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
