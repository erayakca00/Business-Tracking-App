import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TaskTemplatesService } from './task-templates.service';
import { CreateTaskTemplateDto } from './dto/create-task-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../database/entities/user.entity';

@UseGuards(JwtAuthGuard)
@Controller()
export class TaskTemplatesController {
  constructor(private readonly taskTemplatesService: TaskTemplatesService) {}

  @Post('groups/:groupId/templates')
  create(
    @Param('groupId') groupId: string,
    @Body() dto: CreateTaskTemplateDto,
    @Request() req: { user: User },
  ) {
    return this.taskTemplatesService.create(groupId, dto, req.user);
  }

  @Get('groups/:groupId/templates')
  findAllByGroup(
    @Param('groupId') groupId: string,
    @Request() req: { user: User },
  ) {
    return this.taskTemplatesService.findAllByGroup(groupId, req.user);
  }

  @Delete('templates/:id')
  remove(@Param('id') id: string, @Request() req: { user: User }) {
    return this.taskTemplatesService.remove(id, req.user);
  }

  @Post('tasks/from-template/:templateId')
  createFromTemplate(
    @Param('templateId') templateId: string,
    @Request() req: { user: User },
  ) {
    return this.taskTemplatesService.createTaskFromTemplate(
      templateId,
      req.user,
    );
  }
}
