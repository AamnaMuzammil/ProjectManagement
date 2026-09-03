import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';

import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUser } from '../common/decorators/get-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }
  @Patch(':id')
update(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: UpdateUserDto,
  @GetUser('userId') userId: number,
) {
  if (id !== userId) {
    throw new ForbiddenException(
      'You can only update your own profile',
    );
  }

  return this.usersService.update(id, dto);
}

@Delete(':id')
remove(
  @Param('id', ParseIntPipe) id: number,
  @GetUser('userId') userId: number,
) {
  if (id !== userId) {
    throw new ForbiddenException(
      'You can only delete your own account',
    );
  }

  return this.usersService.remove(id);
}
}