
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
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        status: true,
        isAdmin: true,

        projectMemberships: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
            project: {
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
        isAdmin: true,

        projectMemberships: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },

            project: {
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
    const existingUser =
      await this.prisma.user.findUnique({
        where: {
          email: dto.email,
        },
      });

    if (existingUser) {
      throw new ConflictException(
        'Email already exists',
      );
    }

    const hashedPassword =
      await argon2.hash(dto.password);

    /*
     * Roles are now project-specific.
     *
     * Therefore user creation does NOT assign
     * any role.
     *
     * Role will be assigned when the user is
     * added to a project through ProjectMember.
     */

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        department: dto.department,
      },

      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        status: true,
        isAdmin: true,
        createdAt: true,
      },
    });

    return {
      message: 'User created successfully',
      user,
    };
  }

  // =========================
  // UPDATE USER
  // =========================

  async update(
    id: number,
    data: UpdateUserDto,
  ) {
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
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // =========================
  // DELETE USER
  // =========================

  async remove(id: number) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          isAdmin: true,
        },
      });

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    // ADMIN ko delete nahi karna
    if (user.isAdmin) {
      throw new ForbiddenException(
        'ADMIN user cannot be deleted',
      );
    }

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
  // ASSIGN ROLE TO PROJECT MEMBER
  // =========================

  async assignRole(
    userId: number,
    projectId: number,
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

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'User is inactive',
      );
    }

    // Check project
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

    // ADMIN is global, not project role
    if (role.name === 'ADMIN') {
      throw new ForbiddenException(
        'ADMIN cannot be assigned as a project role',
      );
    }

    // Check existing project membership
    const existingMember =
      await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
      });

    if (!existingMember) {
      throw new NotFoundException(
        'User is not a member of this project',
      );
    }

    // Update project-specific role
    const updatedMember =
      await this.prisma.projectMember.update({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },

        data: {
          roleId,
        },

        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },

          role: {
            select: {
              id: true,
              name: true,
            },
          },

          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

    return {
      message: 'Project role assigned successfully',
      member: updatedMember,
    };
  }

  // =========================
  // CHANGE USER STATUS
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

        select: {
          id: true,
          isAdmin: true,
        },
      });

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    // ADMIN cannot be deactivated
    if (user.isAdmin && status === 'INACTIVE') {
      throw new ForbiddenException(
        'ADMIN cannot be deactivated',
      );
    }

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
          isAdmin: true,
        },
      });

    return {
      message:
        'User status updated successfully',

      user: updatedUser,
    };
  }
}

