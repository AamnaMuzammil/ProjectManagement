import {
  IsEnum,
} from 'class-validator';

import { UserStatus } from '../../generated/prisma/enums';

export class UpdateStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;
}