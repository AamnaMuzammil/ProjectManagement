import {
  IsInt,
  IsNotEmpty,
  IsString,
} from 'class-validator';

import { Type } from 'class-transformer';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  taskId: number;
}