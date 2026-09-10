import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // Check whether the user belongs to the project
  private async checkProjectMember(
    projectId: number,
    userId: number,
  ) {
    const project =
      await this.prisma.project.findFirst({
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

    // Project creator is automatically allowed
    if (project.createdBy === userId) {
      return project;
    }

    // Check project member
    const member =
      await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
      });

    // Check project manager also
    const manager =
      await this.prisma.projectManager.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
      });

    if (!member && !manager) {
      throw new ForbiddenException(
        'You are not a member of this project',
      );
    }

    return project;
  }

  // Create comment
  async create(
    dto: CreateCommentDto,
    userId: number,
  ) {
    const task =
      await this.prisma.task.findFirst({
        where: {
          id: dto.taskId,
          deletedAt: null,
        },
      });

    if (!task) {
      throw new NotFoundException(
        'Task not found',
      );
    }

    // User must belong to task's project
    await this.checkProjectMember(
      task.projectId,
      userId,
    );

    return this.prisma.comment.create({
      data: {
        description: dto.description,
        taskId: dto.taskId,
        userId,
      },

      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },

        task: {
          select: {
            id: true,
            title: true,
            projectId: true,
          },
        },
      },
    });
  }

  // Get all comments of a task
  async findByTask(
    taskId: number,
    userId: number,
  ) {
    const task =
      await this.prisma.task.findFirst({
        where: {
          id: taskId,
          deletedAt: null,
        },
      });

    if (!task) {
      throw new NotFoundException(
        'Task not found',
      );
    }

    // Only project members can view comments
    await this.checkProjectMember(
      task.projectId,
      userId,
    );

    return this.prisma.comment.findMany({
      where: {
        taskId,
      },

      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },

      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  // Get one comment
  async findOne(
    id: number,
    userId: number,
  ) {
    const comment =
      await this.prisma.comment.findUnique({
        where: {
          id,
        },

        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
            },
          },

          task: {
            select: {
              id: true,
              title: true,
              projectId: true,
              project: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

    if (!comment) {
      throw new NotFoundException(
        'Comment not found',
      );
    }

    await this.checkProjectMember(
      comment.task.projectId,
      userId,
    );

    return comment;
  }

  // Update own comment
  async update(
    id: number,
    dto: UpdateCommentDto,
    userId: number,
  ) {
    const comment =
      await this.prisma.comment.findUnique({
        where: {
          id,
        },

        include: {
          task: {
            select: {
              projectId: true,
            },
          },
        },
      });

    if (!comment) {
      throw new NotFoundException(
        'Comment not found',
      );
    }

    // User must belong to project
    await this.checkProjectMember(
      comment.task.projectId,
      userId,
    );

    // Only comment owner can update
    if (comment.userId !== userId) {
      throw new ForbiddenException(
        'You can only update your own comment',
      );
    }

    return this.prisma.comment.update({
      where: {
        id,
      },

      data: {
        ...(dto.description !== undefined && {
          description: dto.description,
        }),
      },

      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },

        task: {
          select: {
            id: true,
            title: true,
            projectId: true,
          },
        },
      },
    });
  }

  // Delete comment
  async remove(
    id: number,
    userId: number,
  ) {
    const comment =
      await this.prisma.comment.findUnique({
        where: {
          id,
        },

        include: {
          task: {
            select: {
              projectId: true,
            },
          },
        },
      });

    if (!comment) {
      throw new NotFoundException(
        'Comment not found',
      );
    }

    await this.checkProjectMember(
      comment.task.projectId,
      userId,
    );

    // Comment owner can delete
    if (comment.userId === userId) {
      await this.prisma.comment.delete({
        where: {
          id,
        },
      });

      return {
        message: 'Comment deleted successfully',
      };
    }

    // Check if user is project creator
    const project =
      await this.prisma.project.findFirst({
        where: {
          id: comment.task.projectId,
          deletedAt: null,
        },
      });

    if (
      project &&
      project.createdBy === userId
    ) {
      await this.prisma.comment.delete({
        where: {
          id,
        },
      });

      return {
        message: 'Comment deleted successfully',
      };
    }

    // Check if user is project manager
    const manager =
      await this.prisma.projectManager.findUnique({
        where: {
          projectId_userId: {
            projectId: comment.task.projectId,
            userId,
          },
        },
      });

    if (!manager) {
      throw new ForbiddenException(
        'You can only delete your own comment',
      );
    }

    await this.prisma.comment.delete({
      where: {
        id,
      },
    });

    return {
      message: 'Comment deleted successfully',
    };
  }
}