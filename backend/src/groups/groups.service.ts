import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from '../database/entities/group.entity';
import { UserGroup } from '../database/entities/user-group.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { User } from '../database/entities/user.entity';
import { UsersService } from '../users/users.service';
import { UserRole } from '../database/entities/user-group.entity';
import { Task } from '../database/entities/task.entity';

@Injectable()
export class GroupsService {
    constructor(
        @InjectRepository(Group)
        private readonly groupRepository: Repository<Group>,
        @InjectRepository(UserGroup)
        private readonly userGroupRepository: Repository<UserGroup>,
        @InjectRepository(Task)
        private readonly taskRepository: Repository<Task>,
        private readonly usersService: UsersService,
    ) { }

    async create(createGroupDto: CreateGroupDto, user: User): Promise<Group> {
        const group = this.groupRepository.create({
            ...createGroupDto,
            owner: user,
        });
        const savedGroup = await this.groupRepository.save(group);

        const userGroup = this.userGroupRepository.create({
            user,
            group: savedGroup,
            role: UserRole.ADMIN,
        });
        await this.userGroupRepository.save(userGroup);

        return savedGroup;
    }

    async findAll(user: User): Promise<Group[]> {
        const userGroups = await this.userGroupRepository.find({
            where: { userId: user.id },
            relations: ['group'],
        });
        return userGroups.map((ug) => ug.group);
    }

    async findOne(id: string, user: User): Promise<Group> {
        const userGroup = await this.userGroupRepository.findOne({
            where: { userId: user.id, groupId: id },
            relations: ['group', 'group.owner'],
        });

        if (!userGroup) {
            throw new NotFoundException(`Group with ID ${id} not found or you are not a member`);
        }

        return userGroup.group;
    }

    async update(id: string, updateGroupDto: UpdateGroupDto, user: User): Promise<Group> {
        const group = await this.findOne(id, user);

        // Check if user is admin
        const userGroup = await this.userGroupRepository.findOne({
            where: { userId: user.id, groupId: id },
        });

        if (!userGroup || userGroup.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Only admins can update the group');
        }

        Object.assign(group, updateGroupDto);
        return this.groupRepository.save(group);
    }

    async remove(id: string, user: User): Promise<void> {
        const group = await this.findOne(id, user);

        if (group.owner.id !== user.id) {
            throw new ForbiddenException('Only the owner can delete the group');
        }

        // Manually delete related entities to prevent foreign key errors 
        // regardless of current DB constraint structures
        await this.taskRepository.delete({ groupId: id });
        await this.userGroupRepository.delete({ groupId: id });

        await this.groupRepository.remove(group);
    }

    async addUser(groupId: string, email: string, currentUser: User): Promise<UserGroup> {
        const group = await this.findOne(groupId, currentUser);

        // Check if current user is admin
        const currentUserGroup = await this.userGroupRepository.findOne({
            where: { userId: currentUser.id, groupId },
        });

        if (!currentUserGroup) {
            throw new ForbiddenException('You are not a member of this group');
        }

        if (currentUserGroup.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Only admins can add users');
        }

        const userToAdd = await this.usersService.findByEmail(email);
        if (!userToAdd) {
            throw new NotFoundException(`User with email ${email} not found`);
        }

        const existingMember = await this.userGroupRepository.findOne({
            where: { userId: userToAdd.id, groupId },
        });

        if (existingMember) {
            throw new BadRequestException('User is already a member of this group');
        }

        const newUserGroup = this.userGroupRepository.create({
            user: userToAdd,
            group,
            role: UserRole.MEMBER,
        });

        return this.userGroupRepository.save(newUserGroup);
    }

    async getMembers(groupId: string, currentUser: User): Promise<any[]> {
        // Verify user is a member
        await this.findOne(groupId, currentUser);

        const members = await this.userGroupRepository.find({
            where: { groupId },
            relations: ['user'],
        });

        return members.map(member => ({
            id: member.id,
            userId: member.user.id,
            name: member.user.name,
            email: member.user.email,
            role: member.role,
            joinedAt: member.joinedAt,
        }));
    }

    async getTasks(groupId: string, currentUser: User): Promise<any[]> {
        // Verify user is a member
        const group = await this.findOne(groupId, currentUser);

        // We can use the relation on group if it's loaded, or query tasks directly
        // Groups findOne loads 'group' and 'group.owner', but not tasks.
        // Let's create a query builder on groupRepository or access tasks repo if injected.
        // Since I don't have taskRepository injected here, I can reload group with tasks relation

        const groupWithTasks = await this.groupRepository.findOne({
            where: { id: groupId },
            relations: ['tasks', 'tasks.assignedTo', 'tasks.createdBy'],
            order: {
                tasks: {
                    createdAt: 'DESC',
                }
            } as any
        });

        // findOne check above ensures user has access (is member).

        return groupWithTasks ? groupWithTasks.tasks : [];
    }

    async removeUser(groupId: string, userId: string, currentUser: User): Promise<void> {
        // Check permission
        const currentUserGroup = await this.userGroupRepository.findOne({
            where: { userId: currentUser.id, groupId },
        });

        if (!currentUserGroup || currentUserGroup.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Only admins can remove users');
        }

        const memberToRemove = await this.userGroupRepository.findOne({
            where: { userId, groupId },
        });

        if (!memberToRemove) {
            throw new NotFoundException('Member not found in this group');
        }

        // Unassign user from all tasks in this group
        await this.taskRepository.update(
            { groupId, assignedToId: userId },
            { assignedToId: null as any, assignedTo: null as any }
        );

        await this.userGroupRepository.remove(memberToRemove);
    }
}
