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

import { TasksService } from './tasks.service';

import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
  ) {}

  @Get()
  @Permissions('VIEW_TASK')
  findAll() {
    return this.tasksService.findAll();
  }

  @Get(':id')
  @Permissions('VIEW_TASK')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tasksService.findOne(id);
  }

  @Post()
  @Permissions('CREATE_TASK', 'ASSIGN_TASK')
  create(
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(dto);
  }

  @Patch(':id')
  @Permissions('UPDATE_TASK')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(
      id,
      dto,
    );
  }

  @Delete(':id')
  @Permissions('DELETE_TASK')
  remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tasksService.remove(id);
  }
}