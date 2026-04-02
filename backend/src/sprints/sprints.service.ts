import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Sprint, SprintStatus } from '../database/entities/sprint.entity';
import { Task } from '../database/entities/task.entity';
import { UserGroup, UserRole } from '../database/entities/user-group.entity';
import { User } from '../database/entities/user.entity';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';

@Injectable()
export class SprintsService {
    constructor(
        @InjectRepository(Sprint)
        private readonly sprintRepository: Repository<Sprint>,
        @InjectRepository(Task)
        private readonly taskRepository: Repository<Task>,
        @InjectRepository(UserGroup)
        private readonly userGroupRepository: Repository<UserGroup>,
    ) {}

    private async assertAdmin(groupId: string, userId: string) {
        const membership = await this.userGroupRepository.findOne({
            where: { groupId, userId },
        });
        if (!membership) throw new ForbiddenException('You are not a member of this group');
        if (membership.role !== UserRole.ADMIN) throw new ForbiddenException('Only admins can manage sprints');
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

    async create(groupId: string, dto: CreateSprintDto, user: User): Promise<Sprint> {
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

    async update(sprintId: string, dto: UpdateSprintDto, user: User): Promise<Sprint> {
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

    async remove(sprintId: string, user: User): Promise<void> {
        const sprint = await this.findOne(sprintId);
        await this.assertAdmin(sprint.groupId, user.id);
        // Move all tasks back to backlog
        await this.taskRepository.update({ sprintId }, { sprintId: null as any });
        await this.sprintRepository.remove(sprint);
    }

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
            throw new BadRequestException(`Sprint "${activeSprint.name}" is already active. Complete it first.`);
        }

        sprint.status = SprintStatus.ACTIVE;
        if (!sprint.startDate) sprint.startDate = new Date();
        const savedSprint = await this.sprintRepository.save(sprint);

        // Auto-sync missing due dates to Sprint End Date
        if (savedSprint.endDate && savedSprint.tasks && savedSprint.tasks.length > 0) {
            const tasksToSync = savedSprint.tasks.filter(t => !t.dueDate);
            if (tasksToSync.length > 0) {
                await this.taskRepository
                    .createQueryBuilder()
                    .update(Task)
                    .set({ dueDate: savedSprint.endDate })
                    .whereInIds(tasksToSync.map(t => t.id))
                    .execute();
            }
        }

        return savedSprint;
    }

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
        const unfinishedTasks = sprint.tasks.filter(t => t.status !== 'done');
        if (unfinishedTasks.length > 0) {
            await this.taskRepository.update(
                unfinishedTasks.map(t => t.id) as any,
                { sprintId: null as any }
            );
            // Use a query builder for the IN clause
            await this.taskRepository
                .createQueryBuilder()
                .update(Task)
                .set({ sprintId: null as any })
                .whereInIds(unfinishedTasks.map(t => t.id))
                .execute();
        }

        sprint.status = SprintStatus.COMPLETED;
        sprint.endDate = new Date();
        return this.sprintRepository.save(sprint);
    }

    async addTaskToSprint(sprintId: string, taskId: string, user: User): Promise<Task> {
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

    async removeTaskFromSprint(sprintId: string, taskId: string, user: User): Promise<Task> {
        const sprint = await this.findOne(sprintId);
        await this.assertAdmin(sprint.groupId, user.id);

        const task = await this.taskRepository.findOne({ where: { id: taskId } });
        if (!task) throw new NotFoundException('Task not found');

        task.sprintId = null as any;
        return this.taskRepository.save(task);
    }

    async getBacklog(groupId: string): Promise<Task[]> {
        return this.taskRepository.find({
            where: { groupId, sprintId: IsNull() },
            relations: ['assignedTo', 'createdBy'],
            order: { createdAt: 'DESC' },
        });
    }
}
