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
} from '@nestjs/common';

import { EmployeesService } from './employees.service';

import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('employees')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
  ) {}

  @Get()
  @Permissions('VIEW_EMPLOYEE')
  findAll() {
    return this.employeesService.findAll();
  }

  @Get(':id')
  @Permissions('VIEW_EMPLOYEE')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.employeesService.findOne(id);
  }

  @Post()
  @Permissions('CREATE_EMPLOYEE')
  create(
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.employeesService.create(dto);
  }

  @Patch(':id')
  @Permissions('UPDATE_EMPLOYEE')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(
      id,
      dto,
    );
  }

  @Delete(':id')
  @Permissions('DELETE_EMPLOYEE')
  remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.employeesService.remove(id);
  }
}