import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskCategoryDto } from './dto/create-task-category.dto';
import { UpdateTaskCategoryDto } from './dto/update-task-category.dto';

@Injectable()
export class TaskCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // Check whether the user is an admin
  private async checkAdmin(userId: number): Promise<void> {
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
      throw new NotFoundException('User not found');
    }

    if (!user.isAdmin) {
      throw new ForbiddenException(
        'Only admin can manage task categories',
      );
    }
  }

  // Get all categories
  async findAll() {
    return this.prisma.taskCategoryItem.findMany({
      orderBy: [
        {
          parentCategoryId: 'asc',
        },
        {
          name: 'asc',
        },
      ],
      include: {
        parentCategory: true,
        subcategories: true,
      },
    });
  }

  // Get one category
  async findOne(id: number) {
    const category =
      await this.prisma.taskCategoryItem.findUnique({
        where: {
          id,
        },
        include: {
          parentCategory: true,
          subcategories: true,
          tasks: {
            where: {
              deletedAt: null,
            },
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              projectId: true,
              assignedTo: true,
            },
          },
        },
      });

    if (!category) {
      throw new NotFoundException(
        'Task category not found',
      );
    }

    return category;
  }

  // Create category
  async create(
    dto: CreateTaskCategoryDto,
    userId: number,
  ) {
    await this.checkAdmin(userId);

    /*
     * parentCategoryId is optional.
     *
     * If parentCategoryId is not provided,
     * this category will become a root category.
     *
     * Example:
     * {
     *   "name": "OTHER"
     * }
     *
     * Result:
     * OTHER
     */

    // If parent is provided, make sure it exists
    if (dto.parentCategoryId !== undefined) {
      const parentCategory =
        await this.prisma.taskCategoryItem.findUnique({
          where: {
            id: dto.parentCategoryId,
          },
        });

      if (!parentCategory) {
        throw new NotFoundException(
          'Parent category not found',
        );
      }
    }

    // Prevent duplicate category names
    // under the same parent.
    const existingCategory =
      await this.prisma.taskCategoryItem.findFirst({
        where: {
          name: dto.name,
          parentCategoryId:
            dto.parentCategoryId ?? null,
        },
      });

    if (existingCategory) {
      throw new ConflictException(
        'A category with this name already exists under the selected parent',
      );
    }

    return this.prisma.taskCategoryItem.create({
      data: {
        name: dto.name,
        parentCategoryId:
          dto.parentCategoryId ?? null,
      },
      include: {
        parentCategory: true,
      },
    });
  }

  // Update category
  async update(
    id: number,
    dto: UpdateTaskCategoryDto,
    userId: number,
  ) {
    await this.checkAdmin(userId);

    const category =
      await this.prisma.taskCategoryItem.findUnique({
        where: {
          id,
        },
      });

    if (!category) {
      throw new NotFoundException(
        'Task category not found',
      );
    }

    /*
     * If a new parent is provided,
     * make sure that parent exists.
     */
    if (
      dto.parentCategoryId !== undefined &&
      dto.parentCategoryId !== category.parentCategoryId
    ) {
      const newParent =
        await this.prisma.taskCategoryItem.findUnique({
          where: {
            id: dto.parentCategoryId,
          },
        });

      if (!newParent) {
        throw new NotFoundException(
          'New parent category not found',
        );
      }

      // Category cannot become its own parent
      if (newParent.id === id) {
        throw new BadRequestException(
          'A category cannot be its own parent',
        );
      }

      // Prevent circular hierarchy
      await this.checkCircularReference(
        id,
        dto.parentCategoryId,
      );
    }

    const newName =
      dto.name !== undefined
        ? dto.name
        : category.name;

    const newParentId =
      dto.parentCategoryId !== undefined
        ? dto.parentCategoryId
        : category.parentCategoryId;

    // Prevent duplicate name under same parent
    const duplicate =
      await this.prisma.taskCategoryItem.findFirst({
        where: {
          name: newName,
          parentCategoryId: newParentId,
          id: {
            not: id,
          },
        },
      });

    if (duplicate) {
      throw new ConflictException(
        'A category with this name already exists under the selected parent',
      );
    }

    return this.prisma.taskCategoryItem.update({
      where: {
        id,
      },
      data: {
        ...(dto.name !== undefined && {
          name: dto.name,
        }),

        ...(dto.parentCategoryId !== undefined && {
          parentCategoryId:
            dto.parentCategoryId,
        }),
      },
      include: {
        parentCategory: true,
        subcategories: true,
      },
    });
  }

  // Delete category
  async remove(
    id: number,
    userId: number,
  ) {
    await this.checkAdmin(userId);

    const category =
      await this.prisma.taskCategoryItem.findUnique({
        where: {
          id,
        },
        include: {
          subcategories: true,
          tasks: {
            where: {
              deletedAt: null,
            },
          },
        },
      });

    if (!category) {
      throw new NotFoundException(
        'Task category not found',
      );
    }

    // Do not delete category if it has children
    if (category.subcategories.length > 0) {
      throw new ConflictException(
        'Cannot delete a category that has subcategories. Delete or move its children first.',
      );
    }

    // Do not delete category if tasks are using it
    if (category.tasks.length > 0) {
      throw new ConflictException(
        'Cannot delete a category that is being used by tasks',
      );
    }

    await this.prisma.taskCategoryItem.delete({
      where: {
        id,
      },
    });

    return {
      message: 'Task category deleted successfully',
    };
  }

  // Prevent circular category hierarchy
  private async checkCircularReference(
    categoryId: number,
    newParentId: number,
  ): Promise<void> {
    let currentId: number | null =
      newParentId;

    const visited = new Set<number>();

    while (currentId !== null) {
      if (visited.has(currentId)) {
        throw new BadRequestException(
          'Invalid category hierarchy detected',
        );
      }

      visited.add(currentId);

      if (currentId === categoryId) {
        throw new BadRequestException(
          'Cannot move a category under its own child',
        );
      }

      const currentCategory: {
        parentCategoryId: number | null;
      } | null =
        await this.prisma.taskCategoryItem.findUnique({
          where: {
            id: currentId,
          },
          select: {
            parentCategoryId: true,
          },
        });

      if (!currentCategory) {
        throw new NotFoundException(
          'Parent category not found',
        );
      }

      currentId =
        currentCategory.parentCategoryId;
    }
  }
}