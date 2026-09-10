import {
  IsInt,
  IsNotEmpty,
} from 'class-validator';

export class AddProjectMemberDto {
  @IsInt()
  @IsNotEmpty()
  userId: number;
}