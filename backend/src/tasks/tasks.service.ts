import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from '../database/entities/task.entity';
import { UserGroup, UserRole } from '../database/entities/user-group.entity';
import { Group } from '../database/entities/group.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { User } from '../database/entities/user.entity';
import { TaskActivity, ActivityType } from '../database/entities/task-activity.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TasksService {
    constructor(
        @InjectRepository(Task)
        private readonly taskRepository: Repository<Task>,
        @InjectRepository(UserGroup)
        private readonly userGroupRepository: Repository<UserGroup>,
        @InjectRepository(Group)
        private readonly groupRepository: Repository<Group>,
        @InjectRepository(TaskActivity)
        private readonly activityRepository: Repository<TaskActivity>,
        private readonly notificationsService: NotificationsService,
    ) { }

    private async logActivity(taskId: string, userId: string, type: ActivityType, data?: { from?: string; to?: string }) {
        const entry = this.activityRepository.create({ taskId, userId, type, data: data || null });
        await this.activityRepository.save(entry);
    }

    async getActivity(taskId: string): Promise<TaskActivity[]> {
        return this.activityRepository.find({
            where: { taskId },
            order: { createdAt: 'DESC' },
            relations: ['actor'],
        });
    }

    /**
     * Creates a new task within a specified group.
     * Enforces the following business rules:
     * 1. The user must be a member of the group.
     * 2. If assigning the task to someone, the user must be a group ADMIN.
     * 3. The assignee must belong to the group.
     * 
     * Automatically logs the 'created' event to the task activity audit log.
     * 
     * @param createTaskDto The payload containing task metadata and target group.
     * @param user The authenticated user creating the task.
     * @returns The newly persisted Task entity.
     * @throws ForbiddenException if user lacks required permissions.
     */
    async create(createTaskDto: CreateTaskDto, user: User): Promise<Task> {
        const group = await this.groupRepository.findOne({ where: { id: createTaskDto.groupId } });
        if (!group) throw new NotFoundException('Group not found');

        // Check if user is member of group
        const userGroup = await this.userGroupRepository.findOne({
            where: { userId: user.id, groupId: group.id },
        });
        if (!userGroup) throw new ForbiddenException('You are not a member of this group');

        // Only admins can create tasks
        if (userGroup.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Only group admins can create tasks');
        }

        // Check permission if assigning
        if (createTaskDto.assignedToId) {
            if (userGroup.role !== UserRole.ADMIN) {
                // If not admin, prevent assignment. 
                // We can either throw error or ignore it. Throwing is better for feedback.
                throw new ForbiddenException('Only group admins can assign tasks');
            }

            // Check if assignee is in group
            const assigneeGroup = await this.userGroupRepository.findOne({
                where: { userId: createTaskDto.assignedToId, groupId: group.id },
            });
            if (!assigneeGroup) {
                throw new BadRequestException('Assignee is not a member of this group');
            }
        }

        const task = this.taskRepository.create({
            ...createTaskDto,
            group,
            createdBy: user,
            assignedTo: createTaskDto.assignedToId ? { id: createTaskDto.assignedToId } : undefined,
        });

        const saved = await this.taskRepository.save(task);
        await this.logActivity(saved.id, user.id, 'created');

        // Notify the assignee that they have a new task
        if (createTaskDto.assignedToId) {
            await this.notificationsService.createNotification({
                userId: createTaskDto.assignedToId,
                actorId: user.id,
                type: 'task_assigned',
                message: `You have been assigned a new task: "${saved.title}"`,
                taskId: saved.id,
            });
        }

        return saved;
    }

    /**
     * Retrieves all tasks accessible to the current user globally.
     * Accessible tasks are defined as:
     * - Tasks that belong to groups the user is a member of.
     * - Tasks explicitly assigned to the user.
     * 
     * @param user The authenticated user requesting their dashboard summary.
     * @returns An array of Tasks with preloaded Group, Assignee, and Creator relations.
     */
    async findAll(user: User): Promise<Task[]> {
        // Find all tasks where user is assignee OR user is member of the group
        // 1. Get all group IDs where user is member
        const userGroups = await this.userGroupRepository.find({
            where: { userId: user.id },
            select: ['groupId'],
        });
        const groupIds = userGroups.map(ug => ug.groupId);

        if (groupIds.length === 0) {
            return [];
        }

        return this.taskRepository.createQueryBuilder('task')
            .leftJoinAndSelect('task.group', 'group')
            .leftJoinAndSelect('task.assignedTo', 'assignedTo')
            .leftJoinAndSelect('task.createdBy', 'createdBy')
            .where('task.groupId IN (:...groupIds)', { groupIds })
            .orWhere('task.assignedToId = :userId', { userId: user.id })
            .orderBy('task.createdAt', 'DESC')
            .getMany();
    }

    /**
     * Fetches a single task by its ID and ensures the user has permission to view it.
     * 
     * @param id The UUID of the requested task.
     * @param user The authenticated user.
     * @returns The Task entity.
     * @throws NotFoundException if the task does not exist.
     * @throws ForbiddenException if the user is not in the group that owns the task.
     */
    async findOne(id: string, user: User): Promise<Task> {
        const task = await this.taskRepository.findOne({
            where: { id },
            relations: ['group', 'assignedTo', 'createdBy'],
        });

        if (!task) {
            throw new NotFoundException(`Task with ID ${id} not found`);
        }

        // Check access: User must be member of the group
        const userGroup = await this.userGroupRepository.findOne({
            where: { userId: user.id, groupId: task.group.id },
        });

        if (!userGroup) {
            throw new ForbiddenException('You do not have access to this task');
        }

        return task;
    }

    /**
     * Updates specific fields of an existing task.
     * Business rules applied:
     * - Only Group Admins, the Task Assignee, or the Task Creator can edit the task.
     * - Only Group Admins or the Task Creator can reassign the task.
     * - The new assignee must belong to the task's parent group.
     * - If the status transitions to 'DONE', the `completedAt` timestamp is set.
     * 
     * Automatically logs atomic changes (status change, date change, etc.) into the Task Activity log.
     * 
     * @param id Task UUID
     * @param updateTaskDto Partial payload of allowed updatable fields.
     * @param user The authenticated user attempting the edit.
     */
    async update(id: string, updateTaskDto: UpdateTaskDto, user: User): Promise<Task> {
        const task = await this.findOne(id, user); // Checks access

        // If attempting to change group or assignee, should re-validate?
        // For now, simpler update. UpdateTaskDto doesn't allow changing group.

        // Check user role
        const userGroup = await this.userGroupRepository.findOne({
            where: { userId: user.id, groupId: task.group.id },
        });
        const isAdmin = userGroup && userGroup.role === UserRole.ADMIN;
        const isAssignee = task.assignedTo && task.assignedTo.id === user.id;
        const isCreator = task.createdBy && task.createdBy.id === user.id;

        if (!isAdmin && !isAssignee && !isCreator) {
            throw new ForbiddenException('You can only edit tasks you created or are assigned to');
        }

        if (updateTaskDto.assignedToId !== undefined) {
            if (!isAdmin && !isCreator) {
                throw new ForbiddenException('Only group admins or task creators can assign tasks');
            }

            if (updateTaskDto.assignedToId === null) {
                task.assignedTo = null as any;
            } else {
                // defined check if assignee is in group
                const assigneeGroup = await this.userGroupRepository.findOne({
                    where: { userId: updateTaskDto.assignedToId, groupId: task.group.id },
                });
                if (!assigneeGroup) {
                    throw new BadRequestException('Assignee is not a member of this group');
                }
                task.assignedTo = { id: updateTaskDto.assignedToId } as User;

                // Notify the new assignee
                await this.notificationsService.createNotification({
                    userId: updateTaskDto.assignedToId,
                    actorId: user.id,
                    type: 'task_assigned',
                    message: `You have been assigned to task: "${task.title}"`,
                    taskId: task.id,
                });
            }
        }

        if (updateTaskDto.title && updateTaskDto.title !== task.title) {
            await this.logActivity(task.id, user.id, 'title_changed', { from: task.title, to: updateTaskDto.title });
            task.title = updateTaskDto.title;
        }
        if (updateTaskDto.description !== undefined && updateTaskDto.description !== task.description) {
            await this.logActivity(task.id, user.id, 'description_changed');
            task.description = updateTaskDto.description;
        }
        if (updateTaskDto.status && updateTaskDto.status !== task.status) {
            await this.logActivity(task.id, user.id, 'status_changed', { from: task.status, to: updateTaskDto.status });
            task.status = updateTaskDto.status;
            if (task.status === TaskStatus.DONE) {
                task.completedAt = new Date();
            } else {
                task.completedAt = null as any;
            }
        }
        if (updateTaskDto.priority && updateTaskDto.priority !== task.priority) {
            await this.logActivity(task.id, user.id, 'priority_changed', { from: task.priority, to: updateTaskDto.priority });
            task.priority = updateTaskDto.priority;
        }
        if (updateTaskDto.dueDate && String(updateTaskDto.dueDate) !== String(task.dueDate)) {
            await this.logActivity(task.id, user.id, 'due_date_changed', { to: String(updateTaskDto.dueDate) });
            task.dueDate = updateTaskDto.dueDate;
        }
        if (updateTaskDto.projectTag !== undefined && updateTaskDto.projectTag !== task.projectTag) {
            await this.logActivity(task.id, user.id, 'tag_changed', { from: task.projectTag || '', to: updateTaskDto.projectTag || '' });
            task.projectTag = updateTaskDto.projectTag;
        }
        if (updateTaskDto.effort !== undefined && updateTaskDto.effort !== task.effort) {
            await this.logActivity(task.id, user.id, 'effort_changed', { from: String(task.effort ?? ''), to: String(updateTaskDto.effort) });
            task.effort = updateTaskDto.effort;
        }

        if (updateTaskDto.sprintId !== undefined && updateTaskDto.sprintId !== task.sprintId) {
            task.sprintId = updateTaskDto.sprintId;
        }

        if (updateTaskDto.dependsOnId !== undefined && updateTaskDto.dependsOnId !== task.dependsOnId) {
            task.dependsOnId = updateTaskDto.dependsOnId;
        }

        return this.taskRepository.save(task);
    }

    /**
     * Deletes a task from the database.
     * Ensures only the original creator of the task can delete it.
     * Cascading deletes will handle related entities (like activity logs).
     * 
     * @param id Task UUID to delete.
     * @param user The authenticated user intending to delete the task.
     */
    async remove(id: string, user: User): Promise<void> {
        const task = await this.findOne(id, user);

        const isCreator = task.createdBy && task.createdBy.id === user.id;

        // Check if user is admin of the group
        const userGroup = await this.userGroupRepository.findOne({
            where: { userId: user.id, groupId: task.group.id },
        });
        const isAdmin = userGroup && userGroup.role === UserRole.ADMIN;

        if (!isCreator && !isAdmin) {
            throw new ForbiddenException('Only group admins can delete tasks');
        }

        await this.taskRepository.remove(task);
    }

    async bulkUpdateStatus(taskIds: string[], status: TaskStatus, user: User): Promise<void> {
        // Iterate and update individually to ensure permissions and activity logging are applied
        for (const id of taskIds) {
            try {
                // If it throws (e.g. 404 or 403), we can choose to skip or fail the whole thing.
                // It's better to skip and try updating the rest than to fail all.
                const task = await this.findOne(id, user);
                const userGroup = await this.userGroupRepository.findOne({
                    where: { userId: user.id, groupId: task.group.id },
                });
                const isAdmin = userGroup && userGroup.role === UserRole.ADMIN;
                const isAssignee = task.assignedTo && task.assignedTo.id === user.id;
                const isCreator = task.createdBy && task.createdBy.id === user.id;

                if (!isAdmin && !isAssignee && !isCreator) {
                    continue; // Skip if no permission
                }

                if (task.status !== status) {
                    await this.logActivity(task.id, user.id, 'status_changed', { from: task.status, to: status });
                    task.status = status;
                    if (status === TaskStatus.DONE) {
                        task.completedAt = new Date();
                    } else {
                        task.completedAt = null as any;
                    }
                    await this.taskRepository.save(task);
                }
            } catch (e) {
                // Skip not found tasks or tasks without access
                console.error(`Failed to update task ${id}:`, e);
            }
        }
    }

    async bulkDelete(taskIds: string[], user: User): Promise<void> {
        for (const id of taskIds) {
            try {
                await this.remove(id, user);
            } catch (e) {
                console.error(`Failed to delete task ${id}:`, e);
            }
        }
    }
}
