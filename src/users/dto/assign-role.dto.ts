
import {
  IsInt,
  IsNotEmpty,
} from 'class-validator';

import { Type } from 'class-transformer';

export class AssignRoleDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  projectId: number;

  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  roleId: number;
}

