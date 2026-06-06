import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BulkUpdateStatusDto } from './dto/bulk-update-status.dto';
import { User } from '../database/entities/user.entity';
import { Throttle } from '@nestjs/throttler';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Body() createTaskDto: CreateTaskDto, @Request() req) {
    return this.tasksService.create(createTaskDto, req.user);
  }

  @Get()
  findAll(@Request() req) {
    return this.tasksService.findAll(req.user);
  }

  @Get('my')
  findMyTasks(@Request() req) {
    return this.tasksService.findMyTasks(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.tasksService.findOne(id, req.user);
  }

  @Patch('bulk/status')
  bulkUpdateStatus(@Body() dto: BulkUpdateStatusDto, @Request() req) {
    return this.tasksService.bulkUpdateStatus(
      dto.taskIds,
      dto.status,
      req.user,
    );
  }

  @Post('bulk/delete')
  bulkDelete(@Body('taskIds') taskIds: string[], @Request() req) {
    return this.tasksService.bulkDelete(taskIds, req.user);
  }

  @Get(':id/activity')
  getActivity(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? Number.parseInt(page, 10) : undefined;
    const limitNum = limit ? Number.parseInt(limit, 10) : undefined;
    return this.tasksService.getActivity(id, pageNum, limitNum);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Request() req,
  ) {
    return this.tasksService.update(id, updateTaskDto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.tasksService.remove(id, req.user);
  }

  @Post(':id/summarize')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  summarize(@Param('id') id: string, @Request() req: { user: User }) {
    return this.tasksService.summarizeTask(id, req.user);
  }

  @Post(':id/dependencies')
  addDependency(
    @Param('id') id: string,
    @Body('blockingTaskId') blockingTaskId: string,
    @Request() req,
  ) {
    return this.tasksService.addDependency(id, blockingTaskId, req.user);
  }

  @Delete(':id/dependencies/:blockingId')
  removeDependency(
    @Param('id') id: string,
    @Param('blockingId') blockingId: string,
    @Request() req,
  ) {
    return this.tasksService.removeDependency(id, blockingId, req.user);
  }

  @Post(':id/time/start')
  startTimeLog(
    @Param('id') id: string,
    @Body('note') note: string,
    @Request() req,
  ) {
    return this.tasksService.startTimeLog(id, req.user, note);
  }

  @Post(':id/time/stop')
  stopTimeLog(@Param('id') id: string, @Request() req) {
    return this.tasksService.stopTimeLog(id, req.user);
  }

  @Post(':id/time/manual')
  addManualTimeLog(
    @Param('id') id: string,
    @Body('durationSeconds') durationSeconds: number,
    @Body('note') note: string,
    @Request() req,
  ) {
    return this.tasksService.addManualTimeLog(
      id,
      req.user,
      durationSeconds,
      note,
    );
  }

  @Get(':id/time')
  getTimeLogs(@Param('id') id: string, @Request() req) {
    return this.tasksService.getTimeLogsForTask(id, req.user);
  }
}
