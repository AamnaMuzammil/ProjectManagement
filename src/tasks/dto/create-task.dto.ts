import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

import { Type } from 'class-transformer';

import {
  TaskCategory,
  TaskPriority,
} from '../../generated/prisma/client';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  projectId: number;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  assignedTo: number;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsEnum(TaskCategory)
  category?: TaskCategory;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}