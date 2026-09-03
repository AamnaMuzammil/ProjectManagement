import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
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
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }


    return user;
  }
  async update(id: number, data: { name?: string; department?: string }) {
  await this.findOne(id);

  return this.prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

async remove(id: number) {
  await this.findOne(id);

  await this.prisma.user.delete({
    where: { id },
  });

  return {
    message: 'User deleted successfully',
  };
}
}
