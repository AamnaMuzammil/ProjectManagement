import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { AuditLogsService } from './audit-logs.service';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogsController {
  constructor(
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // Get all audit logs
  @Get()
  findAll() {
    return this.auditLogsService.findAll();
  }

  // Get audit logs of a specific task
  @Get('task/:taskId')
  findByTask(
    @Param('taskId', ParseIntPipe) taskId: number,
  ) {
    return this.auditLogsService.findByTask(taskId);
  }

  // Get one audit log
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.auditLogsService.findOne(id);
  }
}