import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import * as argon2 from 'argon2';

import { PrismaService } from '../prisma/prisma.service';

import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
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
    return this.prisma.user.findMany({
      where: {
        projectMemberships: {
          some: {
            role: {
              name: {
                in: this.employeeRoles,
              },
            },
          },
        },
      },

      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        status: true,

        projectMemberships: {
          include: {
            role: true,
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
  }

  async findOne(id: number) {
    const user =
      await this.prisma.user.findUnique({
        where: { id },

        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          status: true,

          projectMemberships: {
            include: {
              role: true,
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
      throw new NotFoundException(
        'Employee not found',
      );
    }

    const isEmployee =
      user.projectMemberships.some(
        (membership) =>
          this.employeeRoles.includes(
            membership.role.name,
          ),
      );

    if (!isEmployee) {
      throw new NotFoundException(
        'Employee not found',
      );
    }

    return user;
  }

  async create(dto: CreateEmployeeDto) {
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

    const role =
      await this.prisma.role.findUnique({
        where: {
          id: dto.roleId,
        },
      });

    if (!role) {
      throw new NotFoundException(
        'Role not found',
      );
    }

    if (
      !this.employeeRoles.includes(role.name)
    ) {
      throw new ForbiddenException(
        'Only employee roles can be assigned here',
      );
    }

    const hashedPassword =
      await argon2.hash(dto.password);

    /*
     * Role is now project-specific.
     *
     * Employee creation only creates the User.
     * The actual role will be assigned when the
     * employee is added to a project through
     * ProjectMember.
     */

    const employee =
      await this.prisma.user.create({
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
          createdAt: true,
        },
      });

    return {
      message: 'Employee created successfully',
      employee,
    };
  }

  async update(
    id: number,
    dto: UpdateEmployeeDto,
  ) {
    const employee =
      await this.findOne(id);

    const data: {
      name?: string;
      department?: string;
    } = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    if (dto.department !== undefined) {
      data.department = dto.department;
    }

    /*
     * Role is project-specific now.
     *
     * If roleId is provided, update the employee's
     * role in all projects where this employee is
     * already a member.
     */
    if (dto.roleId !== undefined) {
      const role =
        await this.prisma.role.findUnique({
          where: {
            id: dto.roleId,
          },
        });

      if (!role) {
        throw new NotFoundException(
          'Role not found',
        );
      }

      if (
        !this.employeeRoles.includes(
          role.name,
        )
      ) {
        throw new ForbiddenException(
          'Only employee roles can be assigned',
        );
      }

      await this.prisma.projectMember.updateMany({
        where: {
          userId: employee.id,
          role: {
            name: {
              in: this.employeeRoles,
            },
          },
        },
        data: {
          roleId: role.id,
        },
      });
    }

    const updated =
      await this.prisma.user.update({
        where: { id },

        data,

        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          status: true,

          projectMemberships: {
            include: {
              role: true,
              project: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },

          updatedAt: true,
        },
      });

    return {
      message: 'Employee updated successfully',
      employee: updated,
    };
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.prisma.user.delete({
      where: { id },
    });

    return {
      message: 'Employee deleted successfully',
    };
  }
}