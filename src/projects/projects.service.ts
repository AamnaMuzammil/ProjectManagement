import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';

import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { AddProjectManagerDto } from './dto/add-project-manager.dto';

import { PrismaService } from '../prisma/prisma.service';
import { ProjectStatus } from '../generated/prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================
  // CREATE PROJECT
  // =========================================================

  async create(
    dto: CreateProjectDto,
    userId: number,
  ) {
    return this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        status: dto.status,
        createdBy: userId,
      },
    });
  }

  // =========================================================
  // GET ALL PROJECTS
  // =========================================================

  async findAll() {
    return this.prisma.project.findMany({
      where: {
        deletedAt: null,
      },

      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        // Multiple project managers
        managers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                department: true,
              },
            },
          },
        },

        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // =========================================================
  // GET PROJECT BY ID
  // =========================================================

  async findOne(id: number) {
    const project =
      await this.prisma.project.findFirst({
        where: {
          id,
          deletedAt: null,
        },

        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },

          // Multiple project managers
          managers: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  department: true,
                },
              },
            },
          },

          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  department: true,
                },
              },
            },
          },
        },
      });

    if (!project) {
      throw new NotFoundException(
        'Project not found',
      );
    }

    return project;
  }

  // =========================================================
  // UPDATE PROJECT
  // =========================================================

  async update(
    id: number,
    dto: UpdateProjectDto,
    userId: number,
  ) {
    const project =
      await this.prisma.project.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

    if (!project) {
      throw new NotFoundException(
        'Project not found',
      );
    }

    if (project.createdBy !== userId) {
      throw new ForbiddenException(
        'You can only update your own project',
      );
    }

    return this.prisma.project.update({
      where: {
        id,
      },

      data: {
        ...(dto.name !== undefined && {
          name: dto.name,
        }),

        ...(dto.description !== undefined && {
          description: dto.description,
        }),

        ...(dto.status !== undefined && {
          status: dto.status,
        }),
      },
    });
  }

  // =========================================================
  // DELETE PROJECT - SOFT DELETE
  // =========================================================

  async remove(
    id: number,
    userId: number,
  ) {
    const project =
      await this.prisma.project.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

    if (!project) {
      throw new NotFoundException(
        'Project not found',
      );
    }

    if (project.createdBy !== userId) {
      throw new ForbiddenException(
        'You can only delete your own project',
      );
    }

    await this.prisma.project.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
      },
    });

    return {
      message: 'Project deleted successfully',
    };
  }

  // =========================================================
  // GET PROJECTS BY STATUS
  // =========================================================

  async findByStatus(
    status: ProjectStatus,
  ) {
    return this.prisma.project.findMany({
      where: {
        status,
        deletedAt: null,
      },

      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        // Multiple project managers
        managers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                department: true,
              },
            },
          },
        },

        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // =========================================================
  // ADD PROJECT MANAGERS
  // =========================================================

  async addManagers(
    projectId: number,
    dto: AddProjectManagerDto,
    userId: number,
  ) {
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

    // Currently only project creator
    // can assign project managers
    if (project.createdBy !== userId) {
      throw new ForbiddenException(
        'You can only manage managers of your own project',
      );
    }

    // Find users
    const users =
      await this.prisma.user.findMany({
        where: {
          id: {
            in: dto.userIds,
          },

          status: 'ACTIVE',
        },

        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

    // Check missing/inactive users
    const foundUserIds =
      users.map((user) => user.id);

    const missingUserIds =
      dto.userIds.filter(
        (id) =>
          !foundUserIds.includes(id),
      );

    if (missingUserIds.length > 0) {
      throw new NotFoundException(
        `User(s) not found or inactive: ${missingUserIds.join(
          ', ',
        )}`,
      );
    }

    // Check PROJECT_MANAGER role
    const invalidManagers =
      users.filter(
        (user) =>
          !user.roles.some(
            (userRole) =>
              userRole.role.name ===
              'PROJECT_MANAGER',
          ),
      );

    if (invalidManagers.length > 0) {
      throw new ForbiddenException(
        `These users do not have PROJECT_MANAGER role: ${invalidManagers
          .map((user) => user.id)
          .join(', ')}`,
      );
    }

    // Check already existing managers
    const existingManagers =
      await this.prisma.projectManager.findMany({
        where: {
          projectId,

          userId: {
            in: dto.userIds,
          },
        },
      });

    const existingIds =
      existingManagers.map(
        (manager) => manager.userId,
      );

    const newManagerIds =
      dto.userIds.filter(
        (id) =>
          !existingIds.includes(id),
      );

    if (newManagerIds.length === 0) {
      throw new ConflictException(
        'All selected users are already project managers',
      );
    }

    // Create project managers
    await this.prisma.projectManager.createMany({
      data: newManagerIds.map(
        (managerId) => ({
          projectId,
          userId: managerId,
        }),
      ),
    });

    // Project managers are also project members
    await this.prisma.projectMember.createMany({
      data: newManagerIds
        .filter(
          (managerId) =>
            managerId !== project.createdBy,
        )
        .map((managerId) => ({
          projectId,
          userId: managerId,
        })),

      skipDuplicates: true,
    });

    // Return all managers
    return this.prisma.projectManager.findMany({
      where: {
        projectId,
      },

      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
    });
  }

  // =========================================================
  // ADD PROJECT MEMBER
  // =========================================================

  async addMember(
    projectId: number,
    dto: AddProjectMemberDto,
    userId: number,
  ) {
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

    if (project.createdBy !== userId) {
      throw new ForbiddenException(
        'You can only manage members of your own project',
      );
    }

    const user =
      await this.prisma.user.findUnique({
        where: {
          id: dto.userId,
        },
      });

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    if (user.id === project.createdBy) {
      throw new ConflictException(
        'Project manager is already the project owner',
      );
    }

    const existingMember =
      await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: dto.userId,
          },
        },
      });

    if (existingMember) {
      throw new ConflictException(
        'User is already a member of this project',
      );
    }

    return this.prisma.projectMember.create({
      data: {
        projectId,
        userId: dto.userId,
      },

      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
    });
  }

  // =========================================================
  // REMOVE PROJECT MEMBER
  // =========================================================

  async removeMember(
    projectId: number,
    memberId: number,
    userId: number,
  ) {
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

    if (project.createdBy !== userId) {
      throw new ForbiddenException(
        'You can only manage members of your own project',
      );
    }

    const member =
      await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: memberId,
          },
        },
      });

    if (!member) {
      throw new NotFoundException(
        'User is not a member of this project',
      );
    }

    await this.prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId: memberId,
        },
      },
    });

    return {
      message:
        'Project member removed successfully',
    };
  }
}