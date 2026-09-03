import {
  IsEnum,
  IsOptional,
  IsString,
  IsNotEmpty,
} from 'class-validator';

import { ProjectStatus } from '../../generated/prisma/client';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}