import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private readonly employeeRoles = [
    'DEVELOPER',
    'DESIGNER',
    'TESTER',
    'DEPLOYER',
    'FRONTEND',
    'BACKEND',
  ];

  async findAll() {
    return this.prisma.task.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        project: true,
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const task =
      await this.prisma.task.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        include: {
          project: true,
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              roles: {
                include: {
                  role: true,
                },
              },
            },
          },
        },
      });

    if (!task) {
      throw new NotFoundException(
        'Task not found',
      );
    }

    return task;
  }

  async create(dto: CreateTaskDto) {
    const project =
      await this.prisma.project.findFirst({
        where: {
          id: dto.projectId,
          deletedAt: null,
        },
      });

    if (!project) {
      throw new NotFoundException(
        'Project not found',
      );
    }

    const employee =
      await this.prisma.user.findUnique({
        where: {
          id: dto.assignedTo,
        },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

    if (!employee) {
      throw new NotFoundException(
        'Assigned user not found',
      );
    }

    const isEmployee = employee.roles.some(
      (userRole) =>
        this.employeeRoles.includes(
          userRole.role.name,
        ),
    );

    if (!isEmployee) {
      throw new ForbiddenException(
        'Tasks can only be assigned to employees',
      );
    }

    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        projectId: dto.projectId,
        assignedTo: dto.assignedTo,
      },
      include: {
        project: true,
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async update(
    id: number,
    dto: UpdateTaskDto,
  ) {
    await this.findOne(id);

    if (dto.projectId !== undefined) {
      const project =
        await this.prisma.project.findFirst({
          where: {
            id: dto.projectId,
            deletedAt: null,
          },
        });

      if (!project) {
        throw new NotFoundException(
          'Project not found',
        );
      }
    }

    if (dto.assignedTo !== undefined) {
      const employee =
        await this.prisma.user.findUnique({
          where: {
            id: dto.assignedTo,
          },
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        });

      if (!employee) {
        throw new NotFoundException(
          'Assigned user not found',
        );
      }

      const isEmployee =
        employee.roles.some(
          (userRole) =>
            this.employeeRoles.includes(
              userRole.role.name,
            ),
        );

      if (!isEmployee) {
        throw new ForbiddenException(
          'Tasks can only be assigned to employees',
        );
      }
    }

    return this.prisma.task.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && {
          title: dto.title,
        }),

        ...(dto.description !== undefined && {
          description: dto.description,
        }),

        ...(dto.projectId !== undefined && {
          projectId: dto.projectId,
        }),

        ...(dto.assignedTo !== undefined && {
          assignedTo: dto.assignedTo,
        }),
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.prisma.task.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return {
      message: 'Task deleted successfully',
    };
  }
}