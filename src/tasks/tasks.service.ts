import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateSubtaskDto } from './dto/create-subtask.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =========================================================
  // CHECK PROJECT MANAGER / PROJECT OWNER
  // =========================================================

  private async checkProjectOwner(
    projectId: number,
    userId: number,
  ) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        deletedAt: null,
      },
    });

    if (!project) {
      throw new NotFoundException(
        'Project not found',
      );
    }

    if (project.createdBy !== userId) {
      throw new ForbiddenException(
        'You can only manage tasks of your own project',
      );
    }

    return project;
  }

  // =========================================================
  // CHECK USER EXISTS
  // =========================================================

  private async checkUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException(
        'Assigned user not found',
      );
    }

    return user;
  }

  // =========================================================
  // CHECK PROJECT MEMBER
  // =========================================================

  private async checkProjectMember(
    projectId: number,
    userId: number,
  ) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        deletedAt: null,
      },
    });

    if (!project) {
      throw new NotFoundException(
        'Project not found',
      );
    }

    // Project owner/manager is automatically part of
    // his own project
    if (project.createdBy === userId) {
      return true;
    }

    const member =
      await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
      });

    if (!member) {
      throw new ForbiddenException(
        'User is not a member of this project',
      );
    }

    return true;
  }

  // =========================================================
  // CREATE TASK
  // =========================================================

  async create(
    dto: CreateTaskDto,
    userId: number,
  ) {
    // Only project owner can create task
    await this.checkProjectOwner(
      dto.projectId,
      userId,
    );

    // Check assigned user exists
    await this.checkUser(dto.assignedTo);

    // Assigned user must belong to project
    await this.checkProjectMember(
      dto.projectId,
      dto.assignedTo,
    );

    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        projectId: dto.projectId,
        assignedTo: dto.assignedTo,
      },

      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },

        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
    });
  }

  // =========================================================
  // GET ALL TASKS
  // =========================================================

  async findAll() {
    return this.prisma.task.findMany({
      where: {
        deletedAt: null,
      },

      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },

        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },

        parentTask: {
          select: {
            id: true,
            title: true,
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // =========================================================
  // GET ONE TASK
  // =========================================================

  async findOne(id: number) {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        deletedAt: null,
      },

      include: {
        project: {
          select: {
            id: true,
            name: true,
            createdBy: true,
          },
        },

        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },

        parentTask: {
          select: {
            id: true,
            title: true,
          },
        },

        subtasks: {
          where: {
            deletedAt: null,
          },

          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
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

  // =========================================================
  // GET TASKS BY PROJECT
  // =========================================================

  async findByProject(projectId: number) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        deletedAt: null,
      },
    });

    if (!project) {
      throw new NotFoundException(
        'Project not found',
      );
    }

    return this.prisma.task.findMany({
      where: {
        projectId,
        deletedAt: null,
      },

      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },

        subtasks: {
          where: {
            deletedAt: null,
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // =========================================================
  // UPDATE TASK
  // =========================================================

  async update(
    id: number,
    dto: UpdateTaskDto,
    userId: number,
  ) {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!task) {
      throw new NotFoundException(
        'Task not found',
      );
    }

    // Only project owner can manage task
    await this.checkProjectOwner(
      task.projectId,
      userId,
    );

    // If assignedTo is changing,
    // new user must be project member
    if (
      dto.assignedTo !== undefined
    ) {
      await this.checkUser(dto.assignedTo);

      await this.checkProjectMember(
        task.projectId,
        dto.assignedTo,
      );
    }

    return this.prisma.task.update({
      where: {
        id,
      },

      data: {
        ...(dto.title !== undefined && {
          title: dto.title,
        }),

        ...(dto.description !== undefined && {
          description: dto.description,
        }),

        ...(dto.assignedTo !== undefined && {
          assignedTo: dto.assignedTo,
        }),
      },

      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },

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

  // =========================================================
  // DELETE TASK
  // =========================================================

  async remove(
    id: number,
    userId: number,
  ) {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!task) {
      throw new NotFoundException(
        'Task not found',
      );
    }

    // Only project owner can delete task
    await this.checkProjectOwner(
      task.projectId,
      userId,
    );

    await this.prisma.task.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
      },
    });

    return {
      message: 'Task deleted successfully',
    };
  }

  // =========================================================
  // CREATE SUBTASK
  // =========================================================

  async createSubtask(
    parentTaskId: number,
    dto: CreateSubtaskDto,
    userId: number,
  ) {
    const parentTask =
      await this.prisma.task.findFirst({
        where: {
          id: parentTaskId,
          deletedAt: null,
        },
      });

    if (!parentTask) {
      throw new NotFoundException(
        'Parent task not found',
      );
    }

    // Only project owner can create subtask
    await this.checkProjectOwner(
      parentTask.projectId,
      userId,
    );

    // Check assignee
    await this.checkUser(dto.assignedTo);

    // Assignee must belong to project
    await this.checkProjectMember(
      parentTask.projectId,
      dto.assignedTo,
    );

    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        projectId: parentTask.projectId,
        assignedTo: dto.assignedTo,
        parentTaskId,
      },

      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },

        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        parentTask: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  // =========================================================
  // GET SUBTASKS
  // =========================================================

  async findSubtasks(parentTaskId: number) {
    const parentTask =
      await this.prisma.task.findFirst({
        where: {
          id: parentTaskId,
          deletedAt: null,
        },
      });

    if (!parentTask) {
      throw new NotFoundException(
        'Parent task not found',
      );
    }

    return this.prisma.task.findMany({
      where: {
        parentTaskId,
        deletedAt: null,
      },

      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },

      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  // =========================================================
  // DELETE SUBTASK
  // =========================================================

  async removeSubtask(
    id: number,
    userId: number,
  ) {
    const subtask =
      await this.prisma.task.findFirst({
        where: {
          id,
          deletedAt: null,
          parentTaskId: {
            not: null,
          },
        },
      });

    if (!subtask) {
      throw new NotFoundException(
        'Subtask not found',
      );
    }

    await this.checkProjectOwner(
      subtask.projectId,
      userId,
    );

    await this.prisma.task.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
      },
    });

    return {
      message: 'Subtask deleted successfully',
    };
  }
}