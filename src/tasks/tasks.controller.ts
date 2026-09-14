
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';

import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateSubtaskDto } from './dto/create-subtask.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

import { Permissions } from '../common/decorators/permissions.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';

import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { TaskQueryDto } from './dto/task-query.dto';




@Controller('tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // =========================================================
  // CREATE TASK
  // =========================================================

  @Post()
  @Permissions('CREATE_TASK')
  create(@Body() dto: CreateTaskDto, @GetUser('userId') userId: number) {
    return this.tasksService.create(dto, userId);
  }

  // =========================================================
  // GET ALL TASKS
  // =========================================================

  @Get()
  @Permissions('VIEW_TASK')
  findAll(@Query() query: TaskQueryDto) {
    return this.tasksService.findAll(query);
  }

  // =========================================================
  // GET TASKS BY PROJECT
  // =========================================================

  @Get('project/:projectId')
  @Permissions('VIEW_TASK')
  findByProject(
    @Param('projectId', ParseIntPipe)
    projectId: number,
  ) {
    return this.tasksService.findByProject(projectId);
  }

  // =========================================================
  // GET ONE TASK
  // =========================================================

  @Get(':id')
  @Permissions('VIEW_TASK')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskStatusDto,
    @GetUser('userId') userId: number,
  ) {
    return this.tasksService.updateStatus(id, dto, userId);
  }

  // =========================================================
  // UPDATE TASK
  // =========================================================

  @Patch(':id')
  @Permissions('UPDATE_TASK')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
    @GetUser('userId') userId: number,
  ) {
    return this.tasksService.update(id, dto, userId);
  }

  // =========================================================
  // DELETE TASK
  // =========================================================

  @Delete(':id')
  @Permissions('DELETE_TASK')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('userId') userId: number,
  ) {
    return this.tasksService.remove(id, userId);
  }

  // =========================================================
  // CREATE SUBTASK
  // =========================================================

  @Post(':id/subtasks')
  @Permissions('CREATE_SUBTASK')
  createSubtask(
    @Param('id', ParseIntPipe) parentTaskId: number,
    @Body() dto: CreateSubtaskDto,
    @GetUser('userId') userId: number,
  ) {
    return this.tasksService.createSubtask(parentTaskId, dto, userId);
  }

  // =========================================================
  // GET SUBTASKS
  // =========================================================

  @Get(':id/subtasks')
  @Permissions('VIEW_TASK')
  findSubtasks(@Param('id', ParseIntPipe) parentTaskId: number) {
    return this.tasksService.findSubtasks(parentTaskId);
  }

  // =========================================================
  // DELETE SUBTASK
  // =========================================================

  @Delete('subtasks/:id')
  @Permissions('DELETE_SUBTASK')
  removeSubtask(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('userId') userId: number,
  ) {
    return this.tasksService.removeSubtask(id, userId);
  }
}
