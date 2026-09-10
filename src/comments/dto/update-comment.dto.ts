import {
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateCommentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;
}