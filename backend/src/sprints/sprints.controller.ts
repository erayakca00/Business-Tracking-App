import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SprintsService } from './sprints.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller()
export class SprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  // ── Group-scoped sprint routes ──────────────────────────────────────────
  @Get('groups/:groupId/sprints')
  findAllByGroup(@Param('groupId') groupId: string) {
    return this.sprintsService.findAllByGroup(groupId);
  }

  @Post('groups/:groupId/sprints')
  create(
    @Param('groupId') groupId: string,
    @Body() dto: CreateSprintDto,
    @Request() req: any,
  ) {
    return this.sprintsService.create(groupId, dto, req.user);
  }

  @Get('groups/:groupId/backlog')
  getBacklog(@Param('groupId') groupId: string) {
    return this.sprintsService.getBacklog(groupId);
  }

  // ── Sprint-scoped routes ────────────────────────────────────────────────
  @Get('sprints/:id')
  findOne(@Param('id') id: string) {
    return this.sprintsService.findOne(id);
  }

  @Patch('sprints/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSprintDto,
    @Request() req: any,
  ) {
    return this.sprintsService.update(id, dto, req.user);
  }

  @Delete('sprints/:id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.sprintsService.remove(id, req.user);
  }

  @Post('sprints/:id/start')
  startSprint(@Param('id') id: string, @Request() req: any) {
    return this.sprintsService.startSprint(id, req.user);
  }

  @Post('sprints/:id/complete')
  completeSprint(@Param('id') id: string, @Request() req: any) {
    return this.sprintsService.completeSprint(id, req.user);
  }

  @Post('sprints/:id/tasks/:taskId')
  addTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Request() req: any,
  ) {
    return this.sprintsService.addTaskToSprint(id, taskId, req.user);
  }

  @Delete('sprints/:id/tasks/:taskId')
  removeTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Request() req: any,
  ) {
    return this.sprintsService.removeTaskFromSprint(id, taskId, req.user);
  }

  @Get('sprints/:id/snapshots')
  getSprintSnapshots(@Param('id') id: string) {
    return this.sprintsService.getSprintSnapshots(id);
  }

  @Post('sprints/:id/snapshots/trigger')
  triggerManualSnapshot(
    @Param('id') id: string,
    @Request() req: any,
    @Body('date') date?: string,
  ) {
    return this.sprintsService.triggerManualSnapshot(id, req.user, date);
  }

  @Get('sprints/:id/burndown')
  getSprintBurndown(@Param('id') id: string) {
    return this.sprintsService.getSprintBurndown(id);
  }
}
