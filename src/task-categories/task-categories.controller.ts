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

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

import { TaskCategoriesService } from './task-categories.service';
import { CreateTaskCategoryDto } from './dto/create-task-category.dto';
import { UpdateTaskCategoryDto } from './dto/update-task-category.dto';

@Controller('task-categories')
@UseGuards(JwtAuthGuard)
export class TaskCategoriesController {
  constructor(
    private readonly taskCategoriesService: TaskCategoriesService,
  ) {}

  @Get()
  findAll() {
    return this.taskCategoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.taskCategoriesService.findOne(id);
  }

  @Post()
  create(
    @Body() dto: CreateTaskCategoryDto,
    @GetUser('userId') userId: number,
  ) {
    return this.taskCategoriesService.create(dto, userId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskCategoryDto,
    @GetUser('userId') userId: number,
  ) {
    return this.taskCategoriesService.update(
      id,
      dto,
      userId,
    );
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('userId') userId: number,
  ) {
    return this.taskCategoriesService.remove(
      id,
      userId,
    );
  }
}