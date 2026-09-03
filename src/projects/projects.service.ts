import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { UpdateProjectDto } from './dto/update-project.dto';

import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectStatus } from '../generated/prisma/client';


@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectDto, userId: number) {
    return this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        status: dto.status,
        createdBy: userId,
      },
    });
  }

  async findAll() {
    return this.prisma.project.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const project = await this.prisma.project.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }
  async update(
  id: number,
  dto: UpdateProjectDto,
  userId: number,
) {
  const project = await this.prisma.project.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  if (!project) {
    throw new NotFoundException('Project not found');
  }

  if (project.createdBy !== userId) {
    throw new ForbiddenException(
      'You can only update your own project',
    );
  }

  return this.prisma.project.update({
    where: { id },
    data: {
      name: dto.name,
      description: dto.description,
      status: dto.status,
    },
  });
  
}
async remove(id: number, userId: number) {
  const project = await this.prisma.project.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  if (!project) {
    throw new NotFoundException('Project not found');
  }

  if (project.createdBy !== userId) {
    throw new ForbiddenException(
      'You can only delete your own project',
    );
  }

  await this.prisma.project.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  });

  return {
    message: 'Project deleted successfully',
  };
  
}
async findByStatus(status: ProjectStatus) {
  return this.prisma.project.findMany({
    where: {
      status,
      deletedAt: null,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

}
