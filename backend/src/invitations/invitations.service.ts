import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import {
  Invitation,
  InvitationStatus,
} from '../database/entities/invitation.entity';
import { Group } from '../database/entities/group.entity';
import { UserGroup, UserRole } from '../database/entities/user-group.entity';
import { User } from '../database/entities/user.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private readonly invitationRepository: Repository<Invitation>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(UserGroup)
    private readonly userGroupRepository: Repository<UserGroup>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly mailService: MailService,
  ) {}

  private async checkAdminPermission(
    groupId: string,
    userId: string,
  ): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['owner'],
    });

    if (!group) {
      throw new NotFoundException('Group not found.');
    }

    if (group.ownerId === userId) {
      return group;
    }

    const userGroup = await this.userGroupRepository.findOne({
      where: { userId, groupId },
    });

    if (!userGroup || userGroup.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only group admins can manage invitations.');
    }

    return group;
  }

  async invite(
    groupId: string,
    email: string,
    currentUser: User,
  ): Promise<Invitation> {
    const group = await this.checkAdminPermission(groupId, currentUser.id);

    const inviteEmail = email.trim().toLowerCase();

    // Check if user is already a member
    const user = await this.userRepository.findOne({
      where: { email: inviteEmail },
    });
    if (user) {
      const existingMember = await this.userGroupRepository.findOne({
        where: { userId: user.id, groupId },
      });
      if (existingMember) {
        throw new BadRequestException(
          'This user is already a member of the group.',
        );
      }
    }

    // Check if there is already a pending invitation
    let invitation = await this.invitationRepository.findOne({
      where: { email: inviteEmail, groupId, status: InvitationStatus.PENDING },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7 days

    if (invitation) {
      // Update token and expiry
      invitation.token = token;
      invitation.expiresAt = expiresAt;
      invitation.invitedById = currentUser.id;
    } else {
      // Create a new invitation
      invitation = this.invitationRepository.create({
        email: inviteEmail,
        groupId,
        token,
        expiresAt,
        invitedById: currentUser.id,
        status: InvitationStatus.PENDING,
      });
    }

    const savedInvitation = await this.invitationRepository.save(invitation);

    // Send email
    await this.mailService.sendGroupInvitationEmail(
      inviteEmail,
      group.name,
      currentUser.name,
      token,
    );

    return savedInvitation;
  }

  async getInvitations(
    groupId: string,
    currentUser: User,
  ): Promise<Invitation[]> {
    await this.checkAdminPermission(groupId, currentUser.id);

    return this.invitationRepository.find({
      where: { groupId, status: InvitationStatus.PENDING },
      relations: ['invitedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async revokeInvitation(
    groupId: string,
    invitationId: string,
    currentUser: User,
  ): Promise<void> {
    await this.checkAdminPermission(groupId, currentUser.id);

    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId, groupId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found.');
    }

    await this.invitationRepository.remove(invitation);
  }

  async getInviteDetails(token: string): Promise<any> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ['group', 'invitedBy'],
    });

    if (
      !invitation ||
      invitation.status !== InvitationStatus.PENDING ||
      invitation.expiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Invitation is invalid or has expired.');
    }

    return {
      id: invitation.id,
      email: invitation.email,
      groupName: invitation.group.name,
      inviterName: invitation.invitedBy?.name || 'An admin',
      status: invitation.status,
    };
  }

  async acceptInvitation(
    token: string,
    currentUser: User,
  ): Promise<{ groupId: string }> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ['group'],
    });

    if (
      !invitation ||
      invitation.status !== InvitationStatus.PENDING ||
      invitation.expiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Invitation is invalid or has expired.');
    }

    if (currentUser.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenException(
        'This invitation was sent to a different email address.',
      );
    }

    // Add user to group
    const existingMember = await this.userGroupRepository.findOne({
      where: { userId: currentUser.id, groupId: invitation.groupId },
    });

    if (!existingMember) {
      const userGroup = this.userGroupRepository.create({
        userId: currentUser.id,
        groupId: invitation.groupId,
        role: UserRole.MEMBER,
      });
      await this.userGroupRepository.save(userGroup);
    }

    // Mark invitation as accepted
    invitation.status = InvitationStatus.ACCEPTED;
    await this.invitationRepository.save(invitation);

    return { groupId: invitation.groupId };
  }
}
