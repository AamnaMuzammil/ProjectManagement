import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { ProjectsService } from './projects.service';

import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { AddProjectManagerDto } from './dto/add-project-manager.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

import { ProjectStatus } from '../generated/prisma/browser';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
  ) {}

  // =========================================================
  // CREATE PROJECT
  // =========================================================

  @Post()
  create(
    @Body() dto: CreateProjectDto,
    @GetUser('userId') userId: number,
  ) {
    return this.projectsService.create(
      dto,
      userId,
    );
  }

  // =========================================================
  // GET ALL PROJECTS
  // =========================================================

  @Get()
  findAll() {
    return this.projectsService.findAll();
  }

  // =========================================================
  // GET PROJECTS BY STATUS
  // =========================================================

  @Get('status/:status')
  findByStatus(
    @Param(
      'status',
      new ParseEnumPipe(ProjectStatus),
    )
    status: ProjectStatus,
  ) {
    return this.projectsService.findByStatus(
      status,
    );
  }

  // =========================================================
  // GET ONE PROJECT
  // =========================================================

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.projectsService.findOne(id);
  }

  // =========================================================
  // UPDATE PROJECT
  // =========================================================

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectDto,
    @GetUser('userId') userId: number,
  ) {
    return this.projectsService.update(
      id,
      dto,
      userId,
    );
  }

  // =========================================================
  // DELETE PROJECT
  // =========================================================

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('userId') userId: number,
  ) {
    return this.projectsService.remove(
      id,
      userId,
    );
  }

  // =========================================================
  // ADD PROJECT MANAGERS
  // =========================================================

  @Post(':id/managers')
  addManagers(
    @Param('id', ParseIntPipe) projectId: number,
    @Body() dto: AddProjectManagerDto,
    @GetUser('userId') userId: number,
  ) {
    return this.projectsService.addManagers(
      projectId,
      dto,
      userId,
    );
  }

  // =========================================================
  // ADD PROJECT MEMBER
  // =========================================================

  @Post(':id/members')
  addMember(
    @Param('id', ParseIntPipe) projectId: number,
    @Body() dto: AddProjectMemberDto,
    @GetUser('userId') userId: number,
  ) {
    return this.projectsService.addMember(
      projectId,
      dto,
      userId,
    );
  }

  // =========================================================
  // REMOVE PROJECT MEMBER
  // =========================================================

  @Delete(':id/members/:memberId')
  removeMember(
    @Param('id', ParseIntPipe) projectId: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @GetUser('userId') userId: number,
  ) {
    return this.projectsService.removeMember(
      projectId,
      memberId,
      userId,
    );
  }
}