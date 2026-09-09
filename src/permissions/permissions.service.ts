import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.permission.findMany({
      orderBy: {
        id: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    return permission;
  }

  async create(dto: CreatePermissionDto) {
    const existingPermission =
      await this.prisma.permission.findUnique({
        where: {
          name: dto.name,
        },
      });

    if (existingPermission) {
      throw new ConflictException('Permission already exists');
    }

    return this.prisma.permission.create({
      data: {
        name: dto.name,
      },
    });
  }

  async update(id: number, dto: UpdatePermissionDto) {
    await this.findOne(id);

    if (dto.name) {
      const existingPermission =
        await this.prisma.permission.findUnique({
          where: {
            name: dto.name,
          },
        });

      if (
        existingPermission &&
        existingPermission.id !== id
      ) {
        throw new ConflictException(
          'Permission already exists',
        );
      }
    }

    return this.prisma.permission.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.prisma.permission.delete({
      where: { id },
    });

    return {
      message: 'Permission deleted successfully',
    };
  }
}