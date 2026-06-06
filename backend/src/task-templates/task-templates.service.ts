import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskTemplate } from '../database/entities/task-template.entity';
import { Task } from '../database/entities/task.entity';
import { UserGroup, UserRole } from '../database/entities/user-group.entity';
import { User } from '../database/entities/user.entity';
import { CreateTaskTemplateDto } from './dto/create-task-template.dto';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class TaskTemplatesService {
  constructor(
    @InjectRepository(TaskTemplate)
    private readonly taskTemplateRepository: Repository<TaskTemplate>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(UserGroup)
    private readonly userGroupRepository: Repository<UserGroup>,
    private readonly tasksService: TasksService,
  ) {}

  private async assertMember(groupId: string, userId: string) {
    const membership = await this.userGroupRepository.findOne({
      where: { groupId, userId },
    });
    if (!membership)
      throw new ForbiddenException('You are not a member of this group');
    return membership;
  }

  private async assertAdmin(groupId: string, userId: string) {
    const membership = await this.assertMember(groupId, userId);
    if (membership.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only group admins can manage templates');
    }
  }

  async create(
    groupId: string,
    dto: CreateTaskTemplateDto,
    user: User,
  ): Promise<TaskTemplate> {
    await this.assertAdmin(groupId, user.id);

    let templateData: Partial<TaskTemplate> = {
      groupId,
      createdById: user.id,
      name: dto.name,
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      effort: dto.effort,
      projectTag: dto.projectTag,
    };

    // If taskId is provided, clone from the existing task
    if (dto.taskId) {
      const task = await this.taskRepository.findOne({
        where: { id: dto.taskId },
      });
      if (!task) throw new NotFoundException('Task to clone from not found');
      if (task.groupId !== groupId) {
        throw new BadRequestException(
          'Task does not belong to the specified group',
        );
      }
      templateData = {
        ...templateData,
        title: task.title,
        description: task.description,
        priority: task.priority,
        effort: task.effort,
        projectTag: task.projectTag,
      };
    }

    const template = this.taskTemplateRepository.create(templateData);
    return this.taskTemplateRepository.save(template);
  }

  async findAllByGroup(groupId: string, user: User): Promise<TaskTemplate[]> {
    await this.assertMember(groupId, user.id);
    return this.taskTemplateRepository.find({
      where: { groupId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<TaskTemplate> {
    const template = await this.taskTemplateRepository.findOne({
      where: { id },
    });
    if (!template) throw new NotFoundException('Task template not found');
    return template;
  }

  async remove(id: string, user: User): Promise<void> {
    const template = await this.findOne(id);
    await this.assertAdmin(template.groupId, user.id);
    await this.taskTemplateRepository.remove(template);
  }

  async createTaskFromTemplate(templateId: string, user: User): Promise<Task> {
    const template = await this.findOne(templateId);
    await this.assertMember(template.groupId, user.id);

    // Map template fields to CreateTaskDto fields
    const createTaskDto = {
      groupId: template.groupId,
      title: template.title || 'Task from Template',
      description: template.description || '',
      priority: template.priority,
      effort: template.effort || undefined,
      projectTag: template.projectTag || undefined,
    };

    return this.tasksService.create(createTaskDto, user);
  }
}
