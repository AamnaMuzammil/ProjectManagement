import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
  Delete,
} from '@nestjs/common';

import { UpdateProjectDto } from './dto/update-project.dto';

import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { ProjectStatus } from '../generated/prisma/browser';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateProjectDto,
    @GetUser('userId') userId: number,
  ) {
    return this.projectsService.create(dto, userId);
  }

  @Get()
  findAll() {
    return this.projectsService.findAll();
  }
  @Get('status/:status')
findByStatus(
  @Param('status', new ParseEnumPipe(ProjectStatus))
  status: ProjectStatus,
) {
  return this.projectsService.findByStatus(status);
}

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findOne(id);
  }
  @Patch(':id')
update(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: UpdateProjectDto,
  @GetUser('userId') userId: number,
) {
  return this.projectsService.update(id, dto, userId);
}
@Delete(':id')
remove(
  @Param('id', ParseIntPipe) id: number,
  @GetUser('userId') userId: number,
) {
  return this.projectsService.remove(id, userId);
}

}