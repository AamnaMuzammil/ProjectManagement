import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async create(dto: CreateRoleDto) {
    const existingRole = await this.prisma.role.findUnique({
      where: {
        name: dto.name,
      },
    });

    if (existingRole) {
      throw new ConflictException('Role already exists');
    }

    return this.prisma.role.create({
      data: {
        name: dto.name,
      },
    });
  }

  async update(id: number, dto: UpdateRoleDto) {
    await this.findOne(id);

    if (dto.name) {
      const existingRole = await this.prisma.role.findUnique({
        where: {
          name: dto.name,
        },
      });

      if (existingRole && existingRole.id !== id) {
        throw new ConflictException('Role already exists');
      }
    }

    return this.prisma.role.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.prisma.role.delete({
      where: { id },
    });

    return {
      message: 'Role deleted successfully',
    };
  }
}