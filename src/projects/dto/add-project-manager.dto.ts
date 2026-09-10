import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AddProjectManagerDto {
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  userIds: number[];
}