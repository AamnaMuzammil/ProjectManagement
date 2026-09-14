import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(
        PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const userId = request.user?.userId;

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    // =========================
    // GET USER
    // =========================

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        isAdmin: true,
      },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // =========================
    // ADMIN
    // =========================

    if (user.isAdmin) {
      return true;
    }

    // =========================
    // FIND PROJECT ID
    // =========================

    let projectId: number | undefined;

    if (request.params?.projectId) {
      projectId = Number(request.params.projectId);
    }

    if (!projectId && request.body?.projectId) {
      projectId = Number(request.body.projectId);
    }

    // /projects/:id
    if (!projectId && request.params?.id) {
      const controllerName = context.getClass().name;

      if (controllerName === 'ProjectsController') {
        projectId = Number(request.params.id);
      }
    }

    // =========================
    // TASK / COMMENT PROJECT
    // =========================

    if (!projectId && request.params?.id) {
      const controllerName = context.getClass().name;

      if (
        controllerName === 'TasksController' ||
        controllerName === 'CommentsController'
      ) {
        const taskId = Number(request.params.id);

        if (!Number.isNaN(taskId)) {
          const task = await this.prisma.task.findUnique({
            where: {
              id: taskId,
            },
            select: {
              projectId: true,
            },
          });

          if (task) {
            projectId = task.projectId;
          }
        }
      }
    }

    // =========================
    // TASK ID FROM PARAM
    // =========================

    if (!projectId && request.params?.taskId) {
      const taskId = Number(request.params.taskId);

      if (!Number.isNaN(taskId)) {
        const task = await this.prisma.task.findUnique({
          where: {
            id: taskId,
          },
          select: {
            projectId: true,
          },
        });

        if (task) {
          projectId = task.projectId;
        }
      }
    }

    // =========================
    // NO PROJECT CONTEXT
    // =========================

    if (!projectId) {
      const memberships =
        await this.prisma.projectMember.findMany({
          where: {
            userId,
          },
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        });

      const allPermissions = new Set(
        memberships.flatMap((membership) =>
          membership.role.permissions.map(
            (rolePermission) =>
              rolePermission.permission.name,
          ),
        ),
      );

      const hasPermission =
        requiredPermissions.every((permission) =>
          allPermissions.has(permission),
        );

      if (!hasPermission) {
        throw new ForbiddenException(
          'You do not have permission to perform this action',
        );
      }

      return true;
    }

    // =========================
    // PROJECT MEMBERSHIP
    // =========================

    const membership =
      await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

    if (!membership) {
      throw new ForbiddenException(
        'You are not a member of this project',
      );
    }

    const projectPermissions =
      membership.role.permissions.map(
        (rolePermission) =>
          rolePermission.permission.name,
      );

    // =========================
    // PERMISSION CHECK
    // =========================

    const hasPermission =
      requiredPermissions.every((permission) =>
        projectPermissions.includes(permission),
      );

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    return true;
  }
}