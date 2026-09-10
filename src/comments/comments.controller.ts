import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CommentsService } from './comments.service';

import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { GetUser } from '../common/decorators/get-user.decorator';

@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
  ) {}

  // Create comment
  @Post()
  create(
    @Body() dto: CreateCommentDto,
    @GetUser('userId') userId: number,
  ) {
    return this.commentsService.create(
      dto,
      userId,
    );
  }

  // Get all comments of a task
  @Get('task/:taskId')
  findByTask(
    @Param('taskId', ParseIntPipe) taskId: number,
    @GetUser('userId') userId: number,
  ) {
    return this.commentsService.findByTask(
      taskId,
      userId,
    );
  }

  // Get one comment
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('userId') userId: number,
  ) {
    return this.commentsService.findOne(
      id,
      userId,
    );
  }

  // Update own comment
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCommentDto,
    @GetUser('userId') userId: number,
  ) {
    return this.commentsService.update(
      id,
      dto,
      userId,
    );
  }

  // Delete comment
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('userId') userId: number,
  ) {
    return this.commentsService.remove(
      id,
      userId,
    );
  }
}