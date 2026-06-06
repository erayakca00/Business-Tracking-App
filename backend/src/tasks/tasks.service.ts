import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Task, TaskStatus } from '../database/entities/task.entity';
import { UserGroup, UserRole } from '../database/entities/user-group.entity';
import { Group } from '../database/entities/group.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { User } from '../database/entities/user.entity';
import {
  TaskActivity,
  ActivityType,
} from '../database/entities/task-activity.entity';
import { TimeLog } from '../database/entities/time-log.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../events/events.gateway';
import { AiService } from '../ai/ai.service';
import { CommentsService } from '../comments/comments.service';

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
    @InjectRepository(TimeLog)
    private readonly timeLogRepository: Repository<TimeLog>,
    private readonly notificationsService: NotificationsService,
    private readonly eventsGateway: EventsGateway,
    private readonly aiService: AiService,
    private readonly commentsService: CommentsService,
  ) {}

  async logActivity(
    taskId: string,
    userId: string,
    type: ActivityType,
    data?: { from?: string; to?: string },
  ) {
    const entry = this.activityRepository.create({
      taskId,
      userId,
      type,
      data: data || null,
    });
    await this.activityRepository.save(entry);
  }

  async getActivity(
    taskId: string,
    page?: number,
    limit?: number,
  ): Promise<any> {
    if (page !== undefined && limit !== undefined) {
      const skip = (page - 1) * limit;
      const [data, total] = await this.activityRepository.findAndCount({
        where: { taskId },
        order: { createdAt: 'DESC' },
        relations: ['actor'],
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
    const group = await this.groupRepository.findOne({
      where: { id: createTaskDto.groupId },
    });
    if (!group) throw new NotFoundException('Group not found');

    // Check if user is member of group
    const userGroup = await this.userGroupRepository.findOne({
      where: { userId: user.id, groupId: group.id },
    });
    if (!userGroup)
      throw new ForbiddenException('You are not a member of this group');

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
      assignedTo: createTaskDto.assignedToId
        ? { id: createTaskDto.assignedToId }
        : undefined,
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

    // Broadcast task creation via WebSockets
    try {
      const fullTask = await this.taskRepository.findOne({
        where: { id: saved.id },
        relations: ['group', 'assignedTo', 'createdBy'],
      });
      if (fullTask) {
        this.eventsGateway.broadcastTaskCreated(group.id.toString(), fullTask);
      }
    } catch (wsErr) {
      console.error('[WebSockets] Failed to broadcast task creation:', wsErr);
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
    const groupIds = userGroups.map((ug) => ug.groupId);

    if (groupIds.length === 0) {
      return [];
    }

    return this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.group', 'group')
      .leftJoinAndSelect('task.assignedTo', 'assignedTo')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('task.blockedBy', 'blockedBy')
      .leftJoinAndSelect('task.blocking', 'blocking')
      .where('task.groupId IN (:...groupIds)', { groupIds })
      .orWhere('task.assignedToId = :userId', { userId: user.id })
      .orderBy('task.createdAt', 'DESC')
      .getMany();
  }

  async findMyTasks(userId: string): Promise<Task[]> {
    return this.taskRepository.find({
      where: { assignedToId: userId },
      relations: ['group', 'assignedTo', 'createdBy', 'blockedBy', 'blocking'],
      order: { dueDate: 'ASC', createdAt: 'DESC' },
    });
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
      relations: ['group', 'assignedTo', 'createdBy', 'blockedBy', 'blocking'],
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
  private async validateUpdatePermission(task: Task, user: User) {
    const userGroup = await this.userGroupRepository.findOne({
      where: { userId: user.id, groupId: task.group.id },
    });
    const isAdmin = userGroup?.role === UserRole.ADMIN;
    const isAssignee = task.assignedTo?.id === user.id;
    const isCreator = task.createdBy?.id === user.id;

    if (!isAdmin && !isAssignee && !isCreator) {
      throw new ForbiddenException(
        'You can only edit tasks you created or are assigned to',
      );
    }
    return { isAdmin, isCreator };
  }

  private async handleAssignmentUpdate(
    task: Task,
    updateTaskDto: UpdateTaskDto,
    user: User,
    isAdmin: boolean,
    isCreator: boolean,
  ) {
    if (updateTaskDto.assignedToId === undefined) return;

    if (!isAdmin && !isCreator) {
      throw new ForbiddenException(
        'Only group admins or task creators can assign tasks',
      );
    }

    if (updateTaskDto.assignedToId === null) {
      task.assignedTo = null as any;
    } else {
      const assigneeGroup = await this.userGroupRepository.findOne({
        where: { userId: updateTaskDto.assignedToId, groupId: task.group.id },
      });
      if (!assigneeGroup) {
        throw new BadRequestException('Assignee is not a member of this group');
      }
      task.assignedTo = { id: updateTaskDto.assignedToId } as User;

      await this.notificationsService.createNotification({
        userId: updateTaskDto.assignedToId,
        actorId: user.id,
        type: 'task_assigned',
        message: `You have been assigned to task: "${task.title}"`,
        taskId: task.id,
      });
    }
  }

  private async handleStatusUpdate(
    task: Task,
    updateTaskDto: UpdateTaskDto,
    user: User,
  ) {
    if (!updateTaskDto.status || updateTaskDto.status === task.status) return;

    // Block transitions to active states if unresolved blocking dependencies exist
    if (
      updateTaskDto.status !== TaskStatus.TODO &&
      updateTaskDto.status !== TaskStatus.BLOCKED
    ) {
      const activeBlockers =
        task.blockedBy?.filter((t) => t.status !== TaskStatus.DONE) || [];
      if (activeBlockers.length > 0) {
        throw new BadRequestException(
          `Task is blocked by unresolved tasks: ${activeBlockers
            .map((b) => b.title)
            .join(', ')}`,
        );
      }
    }
    await this.logActivity(task.id, user.id, 'status_changed', {
      from: task.status,
      to: updateTaskDto.status,
    });
    task.status = updateTaskDto.status;
    if (task.status === TaskStatus.DONE) {
      task.completedAt = new Date();
    } else {
      task.completedAt = null as any;
    }
  }

  private async handleBasicUpdates(
    task: Task,
    updateTaskDto: UpdateTaskDto,
    user: User,
  ) {
    if (updateTaskDto.title && updateTaskDto.title !== task.title) {
      await this.logActivity(task.id, user.id, 'title_changed', {
        from: task.title,
        to: updateTaskDto.title,
      });
      task.title = updateTaskDto.title;
    }
    if (
      updateTaskDto.description !== undefined &&
      updateTaskDto.description !== task.description
    ) {
      await this.logActivity(task.id, user.id, 'description_changed');
      task.description = updateTaskDto.description;
    }
    if (updateTaskDto.priority && updateTaskDto.priority !== task.priority) {
      await this.logActivity(task.id, user.id, 'priority_changed', {
        from: task.priority,
        to: updateTaskDto.priority,
      });
      task.priority = updateTaskDto.priority;
    }
    if (
      updateTaskDto.dueDate &&
      String(updateTaskDto.dueDate) !== String(task.dueDate)
    ) {
      await this.logActivity(task.id, user.id, 'due_date_changed', {
        to: String(updateTaskDto.dueDate),
      });
      task.dueDate = updateTaskDto.dueDate;
    }
  }

  private async handleAdvancedUpdates(
    task: Task,
    updateTaskDto: UpdateTaskDto,
    user: User,
  ) {
    if (
      updateTaskDto.projectTag !== undefined &&
      updateTaskDto.projectTag !== task.projectTag
    ) {
      await this.logActivity(task.id, user.id, 'tag_changed', {
        from: task.projectTag || '',
        to: updateTaskDto.projectTag || '',
      });
      task.projectTag = updateTaskDto.projectTag;
    }
    if (
      updateTaskDto.effort !== undefined &&
      updateTaskDto.effort !== task.effort
    ) {
      await this.logActivity(task.id, user.id, 'effort_changed', {
        from: String(task.effort ?? ''),
        to: String(updateTaskDto.effort),
      });
      task.effort = updateTaskDto.effort;
    }
    if (
      updateTaskDto.sprintId !== undefined &&
      updateTaskDto.sprintId !== task.sprintId
    ) {
      task.sprintId = updateTaskDto.sprintId;
    }
    if (
      updateTaskDto.dependsOnId !== undefined &&
      updateTaskDto.dependsOnId !== task.dependsOnId
    ) {
      task.dependsOnId = updateTaskDto.dependsOnId;
    }
  }

  private async handleMetadataUpdates(
    task: Task,
    updateTaskDto: UpdateTaskDto,
    user: User,
  ) {
    await this.handleBasicUpdates(task, updateTaskDto, user);
    await this.handleAdvancedUpdates(task, updateTaskDto, user);
  }

  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    user: User,
  ): Promise<Task> {
    const task = await this.findOne(id, user); // Checks access

    const { isAdmin, isCreator } = await this.validateUpdatePermission(
      task,
      user,
    );

    await this.handleAssignmentUpdate(
      task,
      updateTaskDto,
      user,
      isAdmin,
      isCreator,
    );
    await this.handleStatusUpdate(task, updateTaskDto, user);
    await this.handleMetadataUpdates(task, updateTaskDto, user);

    // Invalidate AI Summary cache on task update
    task.aiSummary = null;
    task.aiSummaryUpdatedAt = null;

    const updatedTask = await this.taskRepository.save(task);

    // Broadcast task update via WebSockets
    try {
      const fullTask = await this.taskRepository.findOne({
        where: { id: updatedTask.id },
        relations: ['group', 'assignedTo', 'createdBy'],
      });
      if (fullTask) {
        this.eventsGateway.broadcastTaskUpdated(
          task.group.id.toString(),
          fullTask,
        );
      }
    } catch (wsErr) {
      console.error('[WebSockets] Failed to broadcast task update:', wsErr);
    }

    return updatedTask;
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

    const isCreator = task.createdBy?.id === user.id;

    // Check if user is admin of the group
    const userGroup = await this.userGroupRepository.findOne({
      where: { userId: user.id, groupId: task.group.id },
    });
    const isAdmin = userGroup?.role === UserRole.ADMIN;

    if (!isCreator && !isAdmin) {
      throw new ForbiddenException('Only group admins can delete tasks');
    }

    const groupId = task.group.id.toString();
    await this.taskRepository.remove(task);

    // Broadcast task deletion via WebSockets
    try {
      this.eventsGateway.broadcastTaskDeleted(groupId, id);
    } catch (wsErr) {
      console.error('[WebSockets] Failed to broadcast task deletion:', wsErr);
    }
  }

  private async bulkUpdateSingleTask(
    id: string,
    status: TaskStatus,
    user: User,
  ): Promise<void> {
    const task = await this.findOne(id, user);
    const userGroup = await this.userGroupRepository.findOne({
      where: { userId: user.id, groupId: task.group.id },
    });
    const isAdmin = userGroup?.role === UserRole.ADMIN;
    const isAssignee = task.assignedTo?.id === user.id;
    const isCreator = task.createdBy?.id === user.id;

    if (!isAdmin && !isAssignee && !isCreator) {
      return; // Skip if no permission
    }

    if (task.status !== status) {
      await this.logActivity(task.id, user.id, 'status_changed', {
        from: task.status,
        to: status,
      });
      task.status = status;
      if (status === TaskStatus.DONE) {
        task.completedAt = new Date();
      } else {
        task.completedAt = null as any;
      }
      task.aiSummary = null;
      task.aiSummaryUpdatedAt = null;
      const saved = await this.taskRepository.save(task);

      // Broadcast task update via WebSockets
      try {
        const fullTask = await this.taskRepository.findOne({
          where: { id: saved.id },
          relations: ['group', 'assignedTo', 'createdBy'],
        });
        if (fullTask) {
          this.eventsGateway.broadcastTaskUpdated(
            task.group.id.toString(),
            fullTask,
          );
        }
      } catch (wsErr) {
        console.error(
          '[WebSockets] Failed to broadcast bulk task update:',
          wsErr,
        );
      }
    }
  }

  async bulkUpdateStatus(
    taskIds: string[],
    status: TaskStatus,
    user: User,
  ): Promise<void> {
    // Iterate and update individually to ensure permissions and activity logging are applied
    for (const id of taskIds) {
      try {
        await this.bulkUpdateSingleTask(id, status, user);
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

  async summarizeTask(taskId: string, user: User): Promise<Task> {
    const task = await this.findOne(taskId, user); // Checks access

    const CACHE_TTL_MS = 5 * 60 * 1000;
    if (
      task.aiSummary &&
      task.aiSummaryUpdatedAt &&
      Date.now() - new Date(task.aiSummaryUpdatedAt).getTime() < CACHE_TTL_MS
    ) {
      return task;
    }

    const comments = await this.commentsService.findByTask(taskId);
    const activities = await this.getActivity(taskId);

    const activitiesStr = activities
      .map(
        (a: any) =>
          `- ${a.actor?.name || 'System'}: ${a.type}${
            a.data ? ' (' + JSON.stringify(a.data) + ')' : ''
          }`,
      )
      .join('\n');

    const commentsStr = comments
      .map((c: any) => `- ${c.author?.name || 'User'}: ${c.content}`)
      .join('\n');

    const prompt = `You are a helpful project manager assistant. Summarize the following task's progress, activities, and discussion in exactly 3 sentences. Do not use any markdown bolding, lists, or headers. Only return a plain text paragraph with exactly 3 sentences.

Task Info:
Title: ${task.title}
Description: ${task.description || 'No description provided.'}
Priority: ${task.priority}
Status: ${task.status}
Assignee: ${task.assignedTo?.name || 'Unassigned'}

Recent Activities:
${activitiesStr}

Comments:
${commentsStr}`;

    const summary = await this.aiService.generateSummary(prompt);
    task.aiSummary = summary.trim();
    task.aiSummaryUpdatedAt = new Date();

    return this.taskRepository.save(task);
  }

  private async wouldCreateCycle(
    taskId: string,
    targetBlockerId: string,
  ): Promise<boolean> {
    if (taskId === targetBlockerId) return true;

    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['blocking'],
    });

    if (!task?.blocking || task.blocking.length === 0) {
      return false;
    }

    for (const blockedTask of task.blocking) {
      if (blockedTask.id === targetBlockerId) {
        return true;
      }
      const cycle = await this.wouldCreateCycle(
        blockedTask.id,
        targetBlockerId,
      );
      if (cycle) return true;
    }

    return false;
  }

  async addDependency(
    id: string,
    blockingId: string,
    user: User,
  ): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['blockedBy', 'group'],
    });
    if (!task) throw new NotFoundException('Task not found');

    const blockingTask = await this.taskRepository.findOne({
      where: { id: blockingId },
      relations: ['group'],
    });
    if (!blockingTask) throw new NotFoundException('Blocking task not found');

    if (task.groupId !== blockingTask.groupId) {
      throw new BadRequestException('Tasks must belong to the same group');
    }

    // Check user permission
    await this.findOne(id, user);

    if (id === blockingId) {
      throw new BadRequestException('A task cannot block itself');
    }

    // Check circular dependency
    const hasCycle = await this.wouldCreateCycle(id, blockingId);
    if (hasCycle) {
      throw new BadRequestException(
        'Circular dependency detected. This relationship would create a loop.',
      );
    }

    if (!task.blockedBy.some((t) => t.id === blockingId)) {
      task.blockedBy.push(blockingTask);
      task.dependsOnId = blockingId;
      task.aiSummary = null;
      task.aiSummaryUpdatedAt = null;
      await this.taskRepository.save(task);
      await this.logActivity(id, user.id, 'status_changed', {
        from: 'None',
        to: `Blocked by ${blockingTask.title}`,
      });

      // Broadcast task update via WebSockets
      try {
        const fullTask = await this.findOne(id, user);
        this.eventsGateway.broadcastTaskUpdated(
          task.group.id.toString(),
          fullTask,
        );
      } catch (wsErr) {
        console.error(
          '[WebSockets] Failed to broadcast task update on dependency add:',
          wsErr,
        );
      }
    }

    return this.findOne(id, user);
  }

  async removeDependency(
    id: string,
    blockingId: string,
    user: User,
  ): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['blockedBy', 'group'],
    });
    if (!task) throw new NotFoundException('Task not found');

    // Check user permission
    await this.findOne(id, user);

    task.blockedBy = task.blockedBy.filter((t) => t.id !== blockingId);
    if (task.dependsOnId === blockingId) {
      task.dependsOnId = null;
    }
    task.aiSummary = null;
    task.aiSummaryUpdatedAt = null;
    await this.taskRepository.save(task);
    await this.logActivity(id, user.id, 'status_changed', {
      from: `Blocked by task ${blockingId}`,
      to: 'None',
    });

    // Broadcast task update via WebSockets
    try {
      const fullTask = await this.findOne(id, user);
      this.eventsGateway.broadcastTaskUpdated(
        task.group.id.toString(),
        fullTask,
      );
    } catch (wsErr) {
      console.error(
        '[WebSockets] Failed to broadcast task update on dependency remove:',
        wsErr,
      );
    }

    return this.findOne(id, user);
  }

  async startTimeLog(
    taskId: string,
    user: User,
    note?: string,
  ): Promise<TimeLog> {
    await this.findOne(taskId, user); // checks membership

    // Stop any active time logs for this user
    const activeLog = await this.timeLogRepository.findOne({
      where: { userId: user.id, endedAt: IsNull() },
    });

    if (activeLog) {
      activeLog.endedAt = new Date();
      activeLog.duration = Math.max(
        0,
        Math.round(
          (activeLog.endedAt.getTime() - activeLog.startedAt.getTime()) / 1000,
        ),
      );
      await this.timeLogRepository.save(activeLog);
    }

    const log = this.timeLogRepository.create({
      taskId,
      userId: user.id,
      startedAt: new Date(),
      note,
    });

    return this.timeLogRepository.save(log);
  }

  async stopTimeLog(taskId: string, user: User): Promise<TimeLog> {
    await this.findOne(taskId, user); // checks membership

    const activeLog = await this.timeLogRepository.findOne({
      where: { taskId, userId: user.id, endedAt: IsNull() },
    });

    if (!activeLog) {
      throw new BadRequestException('No active timer running for this task');
    }

    activeLog.endedAt = new Date();
    activeLog.duration = Math.max(
      0,
      Math.round(
        (activeLog.endedAt.getTime() - activeLog.startedAt.getTime()) / 1000,
      ),
    );
    return this.timeLogRepository.save(activeLog);
  }

  async addManualTimeLog(
    taskId: string,
    user: User,
    durationSeconds: number,
    note?: string,
  ): Promise<TimeLog> {
    await this.findOne(taskId, user); // checks membership

    const log = this.timeLogRepository.create({
      taskId,
      userId: user.id,
      startedAt: new Date(Date.now() - durationSeconds * 1000),
      endedAt: new Date(),
      duration: durationSeconds,
      note,
    });

    return this.timeLogRepository.save(log);
  }

  async getTimeLogsForTask(taskId: string, user: User): Promise<TimeLog[]> {
    await this.findOne(taskId, user); // checks membership

    return this.timeLogRepository.find({
      where: { taskId },
      relations: ['user'],
      order: { startedAt: 'DESC' },
    });
  }
}
