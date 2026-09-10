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
  ForbiddenException,
} from '@nestjs/common';

import { UsersService } from './users.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

import { GetUser } from '../common/decorators/get-user.decorator';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto, AssignRolesDto } from './dto/assign-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@Controller('users')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  // =====================================
  // GET ALL USERS
  // ADMIN / users with VIEW_USER
  // =====================================

  @Get()
  @Permissions('VIEW_USER')
  findAll() {
    return this.usersService.findAll();
  }

  // =====================================
  // GET ONE USER
  // =====================================

  @Get(':id')
  @Permissions('VIEW_USER')
  findOne(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.usersService.findOne(id);
  }

  // =====================================
  // ADMIN CREATE USER
  // =====================================

  @Post()
  @Permissions('CREATE_USER')
  create(
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(dto);
  }



@Post(':id/roles')
@Permissions('ASSIGN_ROLE')
assignRoles(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: AssignRolesDto,
) {
  return this.usersService.assignRoles(id, dto);
}



 // =====================================
// UPDATE USER
// =====================================

@Patch(':id')
@Permissions('UPDATE_USER')
update(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: UpdateUserDto,
) {
  return this.usersService.update(id, dto);
}// =====================================
  // ADMIN DELETE USER
  // =====================================

  @Delete(':id')
  @Permissions('DELETE_USER')
  remove(
    @Param('id', ParseIntPipe)
    id: number,

    @GetUser('userId')
    userId: number,
  ) {
    if (id === userId) {
      throw new ForbiddenException(
        'You cannot delete your own account from this endpoint',
      );
    }

    return this.usersService.remove(id);
  }

  // =====================================
  // ADMIN ASSIGN ROLE
  // =====================================

  @Patch(':id/role')
  @Permissions('ASSIGN_ROLE')
  assignRole(
    @Param('id', ParseIntPipe)
    id: number,

    @Body() dto: AssignRoleDto,
  ) {
    return this.usersService.assignRole(
      id,
      dto.roleId,
    );
  }

  // =====================================
  // ADMIN ASSIGN DIRECT PERMISSIONS
  // =====================================

  @Patch(':id/permissions')
  @Permissions('ASSIGN_PERMISSION')
  assignPermissions(
    @Param('id', ParseIntPipe)
    id: number,

    @Body()
    dto: AssignPermissionsDto,
  ) {
    return this.usersService.assignPermissions(
      id,
      dto.permissionIds,
    );
  }

  // =====================================
  // ADMIN ACTIVATE / DEACTIVATE
  // =====================================

  @Patch(':id/status')
  @Permissions('ACTIVATE_USER')
  updateStatus(
    @Param('id', ParseIntPipe)
    id: number,

    @Body()
    dto: UpdateStatusDto,
  ) {
    return this.usersService.updateStatus(
      id,
      dto.status,
    );
  }
}