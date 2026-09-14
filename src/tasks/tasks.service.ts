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
import { TaskCategory, TaskStatus } from '../generated/prisma/client';

import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { TaskQueryDto, TaskSortBy, SortOrder } from './dto/task-query.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================
  // CHECK PROJECT OWNER / PROJECT MANAGER
  // =========================================================

  private async checkProjectOwner(projectId: number, userId: number) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        deletedAt: null,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.createdBy !== userId) {
      throw new ForbiddenException(
        'You can only manage tasks of your own project',
      );
    }

    return project;
  }

  private async checkProjectManager(projectId: number, userId: number) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        deletedAt: null,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Project creator is also considered a manager
    if (project.createdBy === userId) {
      return true;
    }

    const manager = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      include: {
        role: true,
      },
    });

    if (!manager || manager.role.name !== 'PROJECT_MANAGER') {
      throw new ForbiddenException(
        'Only project managers can mark specific tasks as completed',
      );
    }

    return true;
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
      throw new NotFoundException('Assigned user not found');
    }

    return user;
  }

  // =========================================================
  // CHECK PROJECT MEMBER
  // =========================================================

  private async checkProjectMember(projectId: number, userId: number) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        deletedAt: null,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Project owner is automatically part of project
    if (project.createdBy === userId) {
      return true;
    }

    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('User is not a member of this project');
    }

    return true;
  }

  // =========================================================
  // CREATE TASK
  // =========================================================

  async create(dto: CreateTaskDto, userId: number) {
    // Only project owner can currently create task
    await this.checkProjectOwner(dto.projectId, userId);

    // Check assigned user exists
    await this.checkUser(dto.assignedTo);

    // Assigned user must belong to project
    await this.checkProjectMember(dto.projectId, dto.assignedTo);

    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        projectId: dto.projectId,
        assignedTo: dto.assignedTo,

        // Optional fields
        ...(dto.priority !== undefined && {
          priority: dto.priority,
        }),

        ...(dto.category !== undefined && {
          category: dto.category,
        }),

        ...(dto.dueDate !== undefined && {
          dueDate: new Date(dto.dueDate),
        }),

        // status and assignedAt are automatically
        // handled by Prisma defaults
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


async findAll(query: TaskQueryDto) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: any = {
    deletedAt: null,
  };

  // Status filter
  if (query.status) {
    const statuses = query.status
      .split(',')
      .map((status) => status.trim())
      .filter((status) =>
        Object.values(TaskStatus).includes(status as TaskStatus),
      );

    if (statuses.length > 0) {
      where.status = {
        in: statuses,
      };
    }
  }

  // Priority filter
  if (query.priority) {
    where.priority = query.priority;
  }

  const sortBy = query.sortBy ?? TaskSortBy.CREATED_AT;
  const sortOrder = query.sortOrder ?? SortOrder.DESC;

  const [tasks, total] = await Promise.all([
    this.prisma.task.findMany({
      where,

      skip,
      take: limit,

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
        [sortBy]: sortOrder,
      },
    }),

    this.prisma.task.count({
      where,
    }),
  ]);

  return {
    data: tasks,

    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
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
      throw new NotFoundException('Task not found');
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
      throw new NotFoundException('Project not found');
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

  async update(id: number, dto: UpdateTaskDto, userId: number) {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Only project owner can currently manage task
    await this.checkProjectOwner(task.projectId, userId);

    // If assignedTo is changing,
    // new user must be a project member
    if (dto.assignedTo !== undefined) {
      await this.checkUser(dto.assignedTo);

      await this.checkProjectMember(task.projectId, dto.assignedTo);
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

        ...(dto.priority !== undefined && {
          priority: dto.priority,
        }),

        ...(dto.category !== undefined && {
          category: dto.category,
        }),

        ...(dto.dueDate !== undefined && {
          dueDate: new Date(dto.dueDate),
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
  async updateStatus(id: number, dto: UpdateTaskStatusDto, userId: number) {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // User must belong to the project
    await this.checkProjectMember(task.projectId, userId);

    // SPECIFIC task:
    // only project manager can mark it COMPLETED
    if (
      task.category === TaskCategory.SPECIFIC &&
      dto.status === TaskStatus.COMPLETED
    ) {
      await this.checkProjectManager(task.projectId, userId);
    }

    return this.prisma.task.update({
      where: {
        id,
      },

      data: {
        status: dto.status,
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
  // DELETE TASK - SOFT DELETE
  // =========================================================

  async remove(id: number, userId: number) {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Only project owner can delete task
    await this.checkProjectOwner(task.projectId, userId);

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
    const parentTask = await this.prisma.task.findFirst({
      where: {
        id: parentTaskId,
        deletedAt: null,
      },
    });

    if (!parentTask) {
      throw new NotFoundException('Parent task not found');
    }

    // Only project owner can create subtask
    await this.checkProjectOwner(parentTask.projectId, userId);

    // Check assignee
    await this.checkUser(dto.assignedTo);

    // Assignee must belong to project
    await this.checkProjectMember(parentTask.projectId, dto.assignedTo);

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
    const parentTask = await this.prisma.task.findFirst({
      where: {
        id: parentTaskId,
        deletedAt: null,
      },
    });

    if (!parentTask) {
      throw new NotFoundException('Parent task not found');
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

  async removeSubtask(id: number, userId: number) {
    const subtask = await this.prisma.task.findFirst({
      where: {
        id,
        deletedAt: null,
        parentTaskId: {
          not: null,
        },
      },
    });

    if (!subtask) {
      throw new NotFoundException('Subtask not found');
    }

    await this.checkProjectOwner(subtask.projectId, userId);

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
