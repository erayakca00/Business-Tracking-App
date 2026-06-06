import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
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
import { TimeLog } from '../database/entities/time-log.entity';
import { SprintsService } from '../sprints/sprints.service';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(UserGroup)
    private readonly userGroupRepository: Repository<UserGroup>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TimeLog)
    private readonly timeLogRepository: Repository<TimeLog>,
    private readonly usersService: UsersService,
    private readonly sprintsService: SprintsService,
  ) {}

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

  async findAll(user: User): Promise<any[]> {
    return this.groupRepository
      .createQueryBuilder('group')
      .innerJoin(
        'group.userGroups',
        'userGroup',
        'userGroup.userId = :userId',
        { userId: user.id },
      )
      .loadRelationCountAndMap('group.membersCount', 'group.userGroups')
      .loadRelationCountAndMap('group.tasksCount', 'group.tasks')
      .orderBy('group.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: string, user: User): Promise<Group> {
    const userGroup = await this.userGroupRepository.findOne({
      where: { userId: user.id, groupId: id },
      relations: ['group', 'group.owner'],
    });

    if (!userGroup) {
      throw new NotFoundException(
        `Group with ID ${id} not found or you are not a member`,
      );
    }

    return userGroup.group;
  }

  async update(
    id: string,
    updateGroupDto: UpdateGroupDto,
    user: User,
  ): Promise<Group> {
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

  async addUser(
    groupId: string,
    email: string,
    currentUser: User,
  ): Promise<UserGroup> {
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

    return members.map((member) => ({
      id: member.id,
      userId: member.user.id,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
      joinedAt: member.joinedAt,
    }));
  }

  async getTasks(
    groupId: string,
    currentUser: User,
    page?: number,
    limit?: number,
  ): Promise<any> {
    // Verify user is a member
    await this.findOne(groupId, currentUser);

    if (page !== undefined && limit !== undefined) {
      const skip = (page - 1) * limit;
      const [data, total] = await this.taskRepository.findAndCount({
        where: { groupId },
        relations: [
          'assignedTo',
          'createdBy',
          'dependsOn',
          'blockedBy',
          'blocking',
        ],
        order: { createdAt: 'DESC' },
        take: limit,
        skip,
      });
      return {
        data,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    }

    return this.taskRepository.find({
      where: { groupId },
      relations: [
        'assignedTo',
        'createdBy',
        'dependsOn',
        'blockedBy',
        'blocking',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async removeUser(
    groupId: string,
    userId: string,
    currentUser: User,
  ): Promise<void> {
    // Check permission
    const currentUserGroup = await this.userGroupRepository.findOne({
      where: { userId: currentUser.id, groupId },
    });

    if (
      !currentUserGroup ||
      (currentUserGroup.role !== UserRole.ADMIN && currentUser.id !== userId)
    ) {
      throw new ForbiddenException('Only admins can remove other users');
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
      { assignedToId: null as any, assignedTo: null as any },
    );

    await this.userGroupRepository.remove(memberToRemove);
  }

  async getAnalytics(groupId: string, user: User): Promise<any> {
    // Verify user is a member
    await this.findOne(groupId, user);

    const tasks = await this.taskRepository.find({
      where: { groupId },
      relations: ['assignedTo'],
    });
    const members = await this.getMembers(groupId, user);
    const sprints = await this.sprintsService.findAllByGroup(groupId);

    // 1. Status Breakdown
    const statusBreakdown = {
      todo: 0,
      in_progress: 0,
      review: 0,
      done: 0,
      blocked: 0,
    };
    tasks.forEach((t) => {
      if (statusBreakdown[t.status] !== undefined) {
        statusBreakdown[t.status]++;
      }
    });

    // 2. Member Workload
    const workloadMap = new Map<
      string,
      {
        userId: string;
        name: string;
        openTasks: number;
        completedTasks: number;
      }
    >();
    members.forEach((m) => {
      workloadMap.set(m.userId, {
        userId: m.userId,
        name: m.name,
        openTasks: 0,
        completedTasks: 0,
      });
    });
    tasks.forEach((t) => {
      const assigneeId = t.assignedToId;
      if (assigneeId && workloadMap.has(assigneeId)) {
        const stats = workloadMap.get(assigneeId);
        if (stats) {
          if (t.status === 'done') {
            stats.completedTasks++;
          } else {
            stats.openTasks++;
          }
        }
      }
    });
    const memberWorkload = Array.from(workloadMap.values());

    // 3. Overdue Tasks
    const now = new Date();
    const overdueTasks = tasks
      .filter(
        (t) => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < now,
      )
      .map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        priority: t.priority,
        status: t.status,
        assignedTo: t.assignedTo
          ? { id: t.assignedTo.id, name: t.assignedTo.name }
          : null,
      }));

    // 4. Sprint Velocity (Completed sprints)
    const completedSprints = sprints.filter((s) => s.status === 'completed');
    const sprintVelocity = completedSprints
      .map((s) => {
        const completedTasks =
          s.tasks?.filter((t) => t.status === 'done') || [];
        const completedTasksCount = completedTasks.length;
        const completedEffortSum = completedTasks.reduce(
          (sum, t) => sum + (t.effort || 0),
          0,
        );
        return {
          id: s.id,
          name: s.name,
          completedTasks: completedTasksCount,
          completedEffort: completedEffortSum,
          endDate: s.endDate,
        };
      })
      .reverse(); // chronological order

    // 5. Active Sprint Info
    const activeSprint = sprints.find((s) => s.status === 'active');
    const activeSprintInfo = activeSprint
      ? {
          id: activeSprint.id,
          name: activeSprint.name,
          startDate: activeSprint.startDate,
          endDate: activeSprint.endDate,
          goal: activeSprint.goal,
        }
      : null;

    return {
      statusBreakdown,
      memberWorkload,
      overdueTasks,
      sprintVelocity,
      activeSprint: activeSprintInfo,
    };
  }

  async getTimeReport(groupId: string, user: User): Promise<any[]> {
    await this.findOne(groupId, user); // checks membership

    const tasks = await this.taskRepository.find({
      where: { groupId },
      select: ['id'],
    });
    const taskIds = tasks.map((t) => t.id);
    if (taskIds.length === 0) return [];

    // Fetch all completed time logs for group tasks
    const logs = await this.timeLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.task', 'task')
      .leftJoinAndSelect('log.user', 'user')
      .where('log.taskId IN (:...taskIds)', { taskIds })
      .andWhere('log.endedAt IS NOT NULL')
      .orderBy('log.startedAt', 'DESC')
      .getMany();

    return logs;
  }
}
