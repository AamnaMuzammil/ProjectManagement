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
        roles: {
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
        roles: {
          include: {
            role: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
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
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(
        'Employee not found',
      );
    }

    const isEmployee = user.roles.some(
      (userRole) =>
        this.employeeRoles.includes(
          userRole.role.name,
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

    const employee =
      await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          password: hashedPassword,
          department: dto.department,

          roles: {
            create: {
              roleId: role.id,
            },
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

      await this.prisma.userRole.deleteMany({
        where: {
          userId: employee.id,
        },
      });

      await this.prisma.userRole.create({
        data: {
          userId: employee.id,
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
          roles: {
            include: {
              role: true,
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