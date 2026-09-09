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

    // Agar endpoint par koi permission required nahi hai
    // to request allow kar do
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const userId = request.user?.userId;

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        roles: {
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
        },

        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // ADMIN ko automatically full access
    const isAdmin = user.roles.some(
      (userRole) => userRole.role.name === 'ADMIN',
    );

    if (isAdmin) {
      return true;
    }

    // Role ke through milne wali permissions
    const rolePermissions = user.roles.flatMap((userRole) =>
      userRole.role.permissions.map(
        (rolePermission) => rolePermission.permission.name,
      ),
    );

    // Directly user ko di gayi permissions
    const directPermissions = user.permissions.map(
      (userPermission) => userPermission.permission.name,
    );

    // Dono permissions combine
    const allPermissions = new Set([
      ...rolePermissions,
      ...directPermissions,
    ]);

    // Required permissions check
    const hasPermission = requiredPermissions.every(
      (permission) => allPermissions.has(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    return true;
  }
}