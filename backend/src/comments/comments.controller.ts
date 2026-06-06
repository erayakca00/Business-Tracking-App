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
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('tasks/:taskId/comments')
  findAll(@Param('taskId') taskId: string) {
    return this.commentsService.findByTask(taskId);
  }

  @Post('tasks/:taskId/comments')
  create(
    @Param('taskId') taskId: string,
    @Body() dto: CreateCommentDto,
    @Request() req,
  ) {
    return this.commentsService.create(taskId, dto, req.user);
  }

  @Patch('comments/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
    @Request() req,
  ) {
    return this.commentsService.update(id, dto, req.user);
  }

  @Delete('comments/:id')
  remove(@Param('id') id: string, @Request() req) {
    return this.commentsService.remove(id, req.user);
  }
}
