import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import * as argon2 from 'argon2';

import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRolesDto } from './dto/assign-role.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =========================
  // GET ALL USERS
  // =========================

  async findAll() {
    return this.prisma.user.findMany({
      where: {
        // deleted users ka concept abhi nahi hai
      },

      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        status: true,

        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },

        permissions: {
          include: {
            permission: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },

        createdAt: true,
        updatedAt: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // =========================
  // GET ONE USER
  // =========================

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        status: true,

        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },

        permissions: {
          include: {
            permission: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },

        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // =========================
  // ADMIN CREATE USER
  // =========================

  async create(dto: CreateUserDto) {
    // Check email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (existingUser) {
      throw new ConflictException(
        'Email already exists',
      );
    }

    // Roles
    // Explicit type is required because [] alone becomes implicit any[]
    let roles: { id: number; name: string }[] = [];

    if (dto.roleIds && dto.roleIds.length > 0) {
      roles = await this.prisma.role.findMany({
        where: {
          id: {
            in: dto.roleIds,
          },
        },
      });

      // Check all requested roles exist
      if (roles.length !== dto.roleIds.length) {
        throw new NotFoundException(
          'One or more roles not found',
        );
      }

      // ADMIN role cannot be assigned through this endpoint
      const hasAdminRole = roles.some(
        (role) => role.name === 'ADMIN',
      );

      if (hasAdminRole) {
        throw new ForbiddenException(
          'ADMIN role cannot be assigned through this endpoint',
        );
      }
    }

    // Hash password
    const hashedPassword = await argon2.hash(
      dto.password,
    );

    // Create user
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        department: dto.department,

        roles: {
          create: roles.map((role) => ({
            roleId: role.id,
          })),
        },
      },

      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        status: true,

        roles: {
          include: {
            role: true,
          },
        },

        createdAt: true,
      },
    });

    return {
      message: 'User created successfully',
      user,
    };
  }

  // =========================
  // UPDATE OWN PROFILE / ADMIN UPDATE
  // =========================

  async update(
    id: number,
    data: UpdateUserDto,
  ) {
    // Check user exists
    await this.findOne(id);

    return this.prisma.user.update({
      where: {
        id,
      },

      data,

      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // =========================
  // DELETE USER
  // =========================

  async remove(id: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },

      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    // ADMIN ko delete nahi karna
    const isAdmin = user.roles.some(
      (userRole) =>
        userRole.role.name === 'ADMIN',
    );

    if (isAdmin) {
      throw new ForbiddenException(
        'ADMIN user cannot be deleted',
      );
    }

    // Delete user
    await this.prisma.user.delete({
      where: {
        id,
      },
    });

    return {
      message: 'User deleted successfully',
    };
  }

  // =========================
  // ASSIGN ROLE
  // =========================

  async assignRole(
    userId: number,
    roleId: number,
  ) {
    // Check user
    const user =
      await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    // Check role
    const role =
      await this.prisma.role.findUnique({
        where: {
          id: roleId,
        },
      });

    if (!role) {
      throw new NotFoundException(
        'Role not found',
      );
    }

    // ADMIN role API se assign nahi hogi
    if (role.name === 'ADMIN') {
      throw new ForbiddenException(
        'ADMIN role cannot be assigned through API',
      );
    }

    // Existing roles remove
    await this.prisma.userRole.deleteMany({
      where: {
        userId,
      },
    });

    // New role assign
    await this.prisma.userRole.create({
      data: {
        userId,
        roleId,
      },
    });

    return {
      message: 'Role assigned successfully',
      userId,
      role: role.name,
    };
  }

  // =========================
  // ASSIGN PERMISSIONS
  // =========================

  async assignPermissions(
    userId: number,
    permissionIds: number[],
  ) {
    // Check user
    const user =
      await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    // Check permissions
    const permissions =
      await this.prisma.permission.findMany({
        where: {
          id: {
            in: permissionIds,
          },
        },
      });

    if (
      permissions.length !==
      permissionIds.length
    ) {
      throw new NotFoundException(
        'One or more permissions not found',
      );
    }

    // Remove existing permissions
    await this.prisma.userPermission.deleteMany({
      where: {
        userId,
      },
    });

    // Assign new permissions
    if (permissionIds.length > 0) {
      await this.prisma.userPermission.createMany({
        data: permissionIds.map(
          (permissionId) => ({
            userId,
            permissionId,
          }),
        ),
      });
    }

    return {
      message:
        'Permissions assigned successfully',

      userId,

      permissions: permissions.map(
        (permission) => ({
          id: permission.id,
          name: permission.name,
        }),
      ),
    };
  }

  // =========================
  // CHANGE STATUS
  // =========================

  async updateStatus(
    userId: number,
    status: 'ACTIVE' | 'INACTIVE',
  ) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id: userId,
        },

        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    // Check ADMIN
    const isAdmin = user.roles.some(
      (userRole) =>
        userRole.role.name === 'ADMIN',
    );

    // ADMIN cannot be deactivated
    if (isAdmin && status === 'INACTIVE') {
      throw new ForbiddenException(
        'ADMIN cannot be deactivated',
      );
    }

    // Update status
    const updatedUser =
      await this.prisma.user.update({
        where: {
          id: userId,
        },

        data: {
          status,
        },

        select: {
          id: true,
          name: true,
          email: true,
          status: true,
        },
      });

    return {
      message:
        'User status updated successfully',

      user: updatedUser,
    };
  }

 
async assignRoles(userId: number, dto: AssignRolesDto) {
  // Check user
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  // Remove duplicate role IDs from request
  const uniqueRoleIds = [...new Set(dto.roleIds)];

  // Check that all roles exist
  const roles = await this.prisma.role.findMany({
    where: {
      id: {
        in: uniqueRoleIds,
      },
    },
  });

  if (roles.length !== uniqueRoleIds.length) {
    const foundRoleIds = roles.map((role) => role.id);

    const missingRoleIds = uniqueRoleIds.filter(
      (roleId) => !foundRoleIds.includes(roleId),
    );

    throw new NotFoundException(
      `Role(s) not found: ${missingRoleIds.join(', ')}`,
    );
  }

  // Get user's existing roles
  const existingRoles = await this.prisma.userRole.findMany({
    where: {
      userId,
      roleId: {
        in: uniqueRoleIds,
      },
    },
  });

  const existingRoleIds = existingRoles.map(
    (userRole) => userRole.roleId,
  );

  // Only add roles that user doesn't already have
  const newRoleIds = uniqueRoleIds.filter(
    (roleId) => !existingRoleIds.includes(roleId),
  );

  if (newRoleIds.length === 0) {
    throw new ConflictException(
      'User already has all selected roles',
    );
  }

  // Add new roles without removing existing roles
  await this.prisma.userRole.createMany({
    data: newRoleIds.map((roleId) => ({
      userId,
      roleId,
    })),
  });

  // Return updated user with all roles
  return this.prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      status: true,
      roles: {
        include: {
          role: true,
        },
      },
    },
  });
}


}