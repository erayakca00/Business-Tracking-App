import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Sprint, SprintStatus } from '../database/entities/sprint.entity';
import { Task } from '../database/entities/task.entity';
import { UserGroup, UserRole } from '../database/entities/user-group.entity';
import { User } from '../database/entities/user.entity';
import { SprintSnapshot } from '../database/entities/sprint-snapshot.entity';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SprintsService {
  private readonly logger = new Logger(SprintsService.name);

  constructor(
    @InjectRepository(Sprint)
    private readonly sprintRepository: Repository<Sprint>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(UserGroup)
    private readonly userGroupRepository: Repository<UserGroup>,
    @InjectRepository(SprintSnapshot)
    private readonly snapshotRepository: Repository<SprintSnapshot>,
  ) {}

  private async assertAdmin(groupId: string, userId: string) {
    const membership = await this.userGroupRepository.findOne({
      where: { groupId, userId },
    });
    if (!membership)
      throw new ForbiddenException('You are not a member of this group');
    if (membership.role !== UserRole.ADMIN)
      throw new ForbiddenException('Only admins can manage sprints');
  }

  async findAllByGroup(groupId: string): Promise<Sprint[]> {
    return this.sprintRepository.find({
      where: { groupId },
      relations: ['tasks'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(sprintId: string): Promise<Sprint> {
    const sprint = await this.sprintRepository.findOne({
      where: { id: sprintId },
      relations: ['tasks', 'tasks.assignedTo', 'tasks.createdBy'],
    });
    if (!sprint) throw new NotFoundException('Sprint not found');
    return sprint;
  }

  async create(
    groupId: string,
    dto: CreateSprintDto,
    user: User,
  ): Promise<Sprint> {
    await this.assertAdmin(groupId, user.id);
    const sprint = this.sprintRepository.create({
      groupId,
      name: dto.name,
      goal: dto.goal,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      status: SprintStatus.PLANNED,
    });
    return this.sprintRepository.save(sprint);
  }

  async update(
    sprintId: string,
    dto: UpdateSprintDto,
    user: User,
  ): Promise<Sprint> {
    const sprint = await this.findOne(sprintId);
    await this.assertAdmin(sprint.groupId, user.id);
    if (sprint.status === SprintStatus.COMPLETED) {
      throw new BadRequestException('Cannot edit a completed sprint');
    }
    Object.assign(sprint, {
      name: dto.name ?? sprint.name,
      goal: dto.goal ?? sprint.goal,
      startDate: dto.startDate ? new Date(dto.startDate) : sprint.startDate,
      endDate: dto.endDate ? new Date(dto.endDate) : sprint.endDate,
    });
    return this.sprintRepository.save(sprint);
  }

  /**
   * Completely removes a sprint from the database.
   * To prevent orphaned data, any tasks assigned to this sprint will be
   * moved back to the product Backlog (`sprintId` set to null).
   *
   * @param sprintId The UUID of the sprint to delete.
   * @param user The user initiating deletion (must be admin).
   */
  async remove(sprintId: string, user: User): Promise<void> {
    const sprint = await this.findOne(sprintId);
    await this.assertAdmin(sprint.groupId, user.id);
    // Move all tasks back to backlog
    await this.taskRepository.update({ sprintId }, { sprintId: null as any });
    await this.sprintRepository.remove(sprint);
  }

  /**
   * Transitions a planned sprint to an ACTIVE state.
   * Business rules:
   * 1. A group can only have ONE active sprint at a time.
   * 2. When a sprint starts, any task inside it that does NOT currently
   *    have a due date will automatically inherit the sprint's strict end date.
   *    Tasks with an existing due date (like technical debt from past sprints) remain untouched to preserve history.
   */
  async startSprint(sprintId: string, user: User): Promise<Sprint> {
    const sprint = await this.findOne(sprintId);
    await this.assertAdmin(sprint.groupId, user.id);

    if (sprint.status === SprintStatus.ACTIVE) {
      throw new BadRequestException('This sprint is already active');
    }
    if (sprint.status === SprintStatus.COMPLETED) {
      throw new BadRequestException('Cannot restart a completed sprint');
    }

    // Enforce only one active sprint per group
    const activeSprint = await this.sprintRepository.findOne({
      where: { groupId: sprint.groupId, status: SprintStatus.ACTIVE },
    });
    if (activeSprint) {
      throw new BadRequestException(
        `Sprint "${activeSprint.name}" is already active. Complete it first.`,
      );
    }

    sprint.status = SprintStatus.ACTIVE;
    if (!sprint.startDate) sprint.startDate = new Date();
    const savedSprint = await this.sprintRepository.save(sprint);

    // Auto-sync missing due dates to Sprint End Date
    if (
      savedSprint.endDate &&
      savedSprint.tasks &&
      savedSprint.tasks.length > 0
    ) {
      const tasksToSync = savedSprint.tasks.filter((t) => !t.dueDate);
      if (tasksToSync.length > 0) {
        await this.taskRepository
          .createQueryBuilder()
          .update(Task)
          .set({ dueDate: savedSprint.endDate })
          .whereInIds(tasksToSync.map((t) => t.id))
          .execute();
      }
    }

    return savedSprint;
  }

  /**
   * Marks the active sprint as COMPLETED.
   * Implementation details:
   * - Finds all tasks within the sprint that are NOT marked as 'done'.
   * - Automatically moves these unfinished tasks to the Backlog (sprintId = null)
   *   so they can be triaged into the next sprint (Technical Debt handling).
   */
  async completeSprint(sprintId: string, user: User): Promise<Sprint> {
    const sprint = await this.sprintRepository.findOne({
      where: { id: sprintId },
      relations: ['tasks'],
    });
    if (!sprint) throw new NotFoundException('Sprint not found');
    await this.assertAdmin(sprint.groupId, user.id);

    if (sprint.status !== SprintStatus.ACTIVE) {
      throw new BadRequestException('Only an active sprint can be completed');
    }

    // Move unfinished tasks back to backlog (technical debt)
    const unfinishedTasks = sprint.tasks.filter((t) => t.status !== 'done');
    if (unfinishedTasks.length > 0) {
      for (const t of unfinishedTasks) {
        t.sprintId = null as any;
      }
      await this.taskRepository.save(unfinishedTasks);
    }

    sprint.status = SprintStatus.COMPLETED;
    sprint.endDate = new Date();
    return this.sprintRepository.save(sprint);
  }

  async addTaskToSprint(
    sprintId: string,
    taskId: string,
    user: User,
  ): Promise<Task> {
    const sprint = await this.findOne(sprintId);
    await this.assertAdmin(sprint.groupId, user.id);

    if (sprint.status === SprintStatus.COMPLETED) {
      throw new BadRequestException('Cannot add tasks to a completed sprint');
    }

    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.groupId !== sprint.groupId) {
      throw new BadRequestException('Task does not belong to this group');
    }

    task.sprintId = sprintId;
    return this.taskRepository.save(task);
  }

  async removeTaskFromSprint(
    sprintId: string,
    taskId: string,
    user: User,
  ): Promise<Task> {
    const sprint = await this.findOne(sprintId);
    await this.assertAdmin(sprint.groupId, user.id);

    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    task.sprintId = null as any;
    return this.taskRepository.save(task);
  }

  async getBacklog(groupId: string): Promise<Task[]> {
    return this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignedTo', 'assignedTo')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoin('task.sprint', 'sprint')
      .where('task.groupId = :groupId', { groupId })
      .andWhere(
        '(task.sprintId IS NULL OR (sprint.status = :completedStatus AND task.status != :doneStatus))',
        {
          completedStatus: SprintStatus.COMPLETED,
          doneStatus: 'done',
        },
      )
      .orderBy('task.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Captures a performance snapshot for all active sprints globally.
   * Triggered automatically at midnight via Cron scheduler.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async recordDailySnapshots() {
    this.logger.log('[Cron] Capturing daily active sprint snapshots...');
    const activeSprints = await this.sprintRepository.find({
      where: { status: SprintStatus.ACTIVE },
      relations: ['tasks'],
    });

    if (activeSprints.length === 0) {
      this.logger.log('[Cron] No active sprints found to capture.');
      return;
    }

    const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    for (const sprint of activeSprints) {
      try {
        await this.saveSnapshotForSprint(sprint, dateStr);
      } catch (err) {
        this.logger.error(
          `[Cron] Failed to save snapshot for sprint ${sprint.id}:`,
          err,
        );
      }
    }
  }

  /**
   * Helper to compute and write metrics to the database for a specific sprint and date.
   */
  private async saveSnapshotForSprint(
    sprint: Sprint,
    dateStr: string,
  ): Promise<SprintSnapshot> {
    const totalTasks = sprint.tasks?.length || 0;
    const completedTasks =
      sprint.tasks?.filter((t) => t.status === 'done').length || 0;

    let totalEffort = 0;
    let completedEffort = 0;

    if (sprint.tasks && sprint.tasks.length > 0) {
      for (const task of sprint.tasks) {
        const effort = task.effort || 0;
        totalEffort += effort;
        if (task.status === 'done') {
          completedEffort += effort;
        }
      }
    }

    let snapshot = await this.snapshotRepository.findOne({
      where: { sprintId: sprint.id, date: dateStr },
    });

    if (!snapshot) {
      snapshot = this.snapshotRepository.create({
        sprintId: sprint.id,
        date: dateStr,
      });
    }

    snapshot.totalTasks = totalTasks;
    snapshot.completedTasks = completedTasks;
    snapshot.totalEffort = totalEffort;
    snapshot.completedEffort = completedEffort;

    const saved = await this.snapshotRepository.save(snapshot);
    this.logger.log(
      `Captured snapshot for sprint "${sprint.name}" on ${dateStr}: ${completedTasks}/${totalTasks} tasks, ${completedEffort}/${totalEffort} effort.`,
    );
    return saved;
  }

  /**
   * Triggers snapshot capture manually for verification or history correction.
   */
  async triggerManualSnapshot(
    sprintId: string,
    user: User,
    targetDate?: string,
  ): Promise<SprintSnapshot> {
    const sprint = await this.findOne(sprintId);
    await this.assertAdmin(sprint.groupId, user.id);

    const dateStr = targetDate || new Date().toISOString().slice(0, 10);
    return this.saveSnapshotForSprint(sprint, dateStr);
  }

  /**
   * Retrieves all snapshot metrics for a sprint ordered by date ascending.
   */
  async getSprintSnapshots(sprintId: string): Promise<SprintSnapshot[]> {
    return this.snapshotRepository.find({
      where: { sprintId },
      order: { date: 'ASC' },
    });
  }

  /**
   * Computes the ideal and actual burndown data for a sprint.
   */
  async getSprintBurndown(sprintId: string): Promise<any> {
    const sprint = await this.sprintRepository.findOne({
      where: { id: sprintId },
      relations: ['tasks'],
    });
    if (!sprint) throw new NotFoundException('Sprint not found');

    const snapshots = await this.getSprintSnapshots(sprintId);

    if (!sprint.startDate || !sprint.endDate) {
      return {
        startDate: null,
        endDate: null,
        burndownData: [],
      };
    }

    const dates: string[] = [];
    const start = new Date(sprint.startDate);
    const end = new Date(sprint.endDate);

    // Normalize to local date string boundaries
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);
    const normalizedEnd = new Date(end);
    normalizedEnd.setHours(0, 0, 0, 0);

    while (current <= normalizedEnd) {
      dates.push(current.toISOString().slice(0, 10));
      current.setDate(current.getDate() + 1);
    }

    // Get total tasks and effort at the start of the sprint
    const firstSnapshot = snapshots.find((s) => s.date === dates[0]);
    const totalTasksAtStart = firstSnapshot
      ? firstSnapshot.totalTasks
      : sprint.tasks?.length || 0;
    const totalEffortAtStart = firstSnapshot
      ? firstSnapshot.totalEffort
      : sprint.tasks?.reduce((sum, t) => sum + (t.effort || 0), 0) || 0;

    const totalDays = dates.length;
    const todayStr = new Date().toISOString().slice(0, 10);

    // Calculate real-time "today" values if snapshot hasn't been recorded yet
    const todayTasksTotal = sprint.tasks?.length || 0;
    const todayTasksCompleted =
      sprint.tasks?.filter((t) => t.status === 'done').length || 0;
    const todayRemainingTasks = todayTasksTotal - todayTasksCompleted;

    let todayEffortTotal = 0;
    let todayEffortCompleted = 0;
    if (sprint.tasks && sprint.tasks.length > 0) {
      sprint.tasks.forEach((t) => {
        const effort = t.effort || 0;
        todayEffortTotal += effort;
        if (t.status === 'done') {
          todayEffortCompleted += effort;
        }
      });
    }
    const todayRemainingEffort = todayEffortTotal - todayEffortCompleted;

    const burndownData = dates.map((dateStr, index) => {
      // Ideal calculation
      const idealTasks =
        totalDays > 1
          ? Math.max(
              0,
              parseFloat(
                (totalTasksAtStart * (1 - index / (totalDays - 1))).toFixed(2),
              ),
            )
          : 0;
      const idealEffort =
        totalDays > 1
          ? Math.max(
              0,
              parseFloat(
                (totalEffortAtStart * (1 - index / (totalDays - 1))).toFixed(2),
              ),
            )
          : 0;

      // Actual calculation
      let remainingTasks: number | null = null;
      let remainingEffort: number | null = null;

      const snapshot = snapshots.find((s) => s.date === dateStr);
      if (snapshot) {
        remainingTasks = snapshot.totalTasks - snapshot.completedTasks;
        remainingEffort = snapshot.totalEffort - snapshot.completedEffort;
      } else if (dateStr === todayStr) {
        // If today and no snapshot recorded yet, use real-time values
        remainingTasks = todayRemainingTasks;
        remainingEffort = todayRemainingEffort;
      } else if (dateStr < todayStr) {
        // Past day, but no snapshot was recorded (e.g. server was off). Fall back to preceding snapshot or start value
        const previousSnapshots = snapshots.filter((s) => s.date < dateStr);
        if (previousSnapshots.length > 0) {
          const latestPrev = previousSnapshots[previousSnapshots.length - 1];
          remainingTasks = latestPrev.totalTasks - latestPrev.completedTasks;
          remainingEffort = latestPrev.totalEffort - latestPrev.completedEffort;
        } else {
          remainingTasks = totalTasksAtStart;
          remainingEffort = totalEffortAtStart;
        }
      }

      return {
        date: dateStr,
        idealTasks,
        idealEffort,
        actualTasks: remainingTasks,
        actualEffort: remainingEffort,
      };
    });

    return {
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      burndownData,
    };
  }
}
