import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BulkUpdateStatusDto } from './dto/bulk-update-status.dto';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
    constructor(private readonly tasksService: TasksService) { }

    @Post()
    create(@Body() createTaskDto: CreateTaskDto, @Request() req) {
        return this.tasksService.create(createTaskDto, req.user);
    }

    @Get()
    findAll(@Request() req) {
        return this.tasksService.findAll(req.user);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req) {
        return this.tasksService.findOne(id, req.user);
    }

    @Patch('bulk/status')
    bulkUpdateStatus(@Body() dto: BulkUpdateStatusDto, @Request() req) {
        return this.tasksService.bulkUpdateStatus(dto.taskIds, dto.status, req.user);
    }

    @Post('bulk/delete')
    bulkDelete(@Body('taskIds') taskIds: string[], @Request() req) {
        return this.tasksService.bulkDelete(taskIds, req.user);
    }

    @Get(':id/activity')
    getActivity(@Param('id') id: string) {
        return this.tasksService.getActivity(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto, @Request() req) {
        return this.tasksService.update(id, updateTaskDto, req.user);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        return this.tasksService.remove(id, req.user);
    }
}
