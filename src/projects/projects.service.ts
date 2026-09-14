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
    // Project creator will automatically become
    // PROJECT_MANAGER of this project.

    const projectManagerRole =
      await this.prisma.role.findUnique({
        where: {
          name: 'PROJECT_MANAGER',
        },
      });

    if (!projectManagerRole) {
      throw new NotFoundException(
        'PROJECT_MANAGER role not found',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const project =
          await tx.project.create({
            data: {
              name: dto.name,
              description: dto.description,
              status: dto.status,
              createdBy: userId,
            },
          });

        await tx.projectMember.create({
          data: {
            projectId: project.id,
            userId,
            roleId: projectManagerRole.id,
          },
        });

        return project;
      },
    );
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

            role: {
              select: {
                id: true,
                name: true,
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

              role: {
                select: {
                  id: true,
                  name: true,
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

            role: {
              select: {
                id: true,
                name: true,
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

    // Find PROJECT_MANAGER role
    const projectManagerRole =
      await this.prisma.role.findUnique({
        where: {
          name: 'PROJECT_MANAGER',
        },
      });

    if (!projectManagerRole) {
      throw new NotFoundException(
        'PROJECT_MANAGER role not found',
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

        select: {
          id: true,
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

    // Check already existing project members
    const existingMembers =
      await this.prisma.projectMember.findMany({
        where: {
          projectId,

          userId: {
            in: dto.userIds,
          },
        },

        include: {
          role: true,
        },
      });

    const existingManagerIds =
      existingMembers
        .filter(
          (member) =>
            member.role.name ===
            'PROJECT_MANAGER',
        )
        .map(
          (member) => member.userId,
        );

    const newManagerIds =
      dto.userIds.filter(
        (id) =>
          !existingManagerIds.includes(id),
      );

    if (newManagerIds.length === 0) {
      throw new ConflictException(
        'All selected users are already project managers',
      );
    }

    // Users already members of this project
    // will have their role changed to PROJECT_MANAGER.
    const existingMemberIds =
      existingMembers.map(
        (member) => member.userId,
      );

    const existingMemberIdsToUpdate =
      newManagerIds.filter((id) =>
        existingMemberIds.includes(id),
      );

    const newMemberIds =
      newManagerIds.filter(
        (id) =>
          !existingMemberIds.includes(id),
      );

    // Convert existing members to PROJECT_MANAGER
    if (
      existingMemberIdsToUpdate.length > 0
    ) {
      await this.prisma.projectMember.updateMany({
        where: {
          projectId,

          userId: {
            in: existingMemberIdsToUpdate,
          },
        },

        data: {
          roleId: projectManagerRole.id,
        },
      });
    }

    // Add completely new project managers
    if (newMemberIds.length > 0) {
      await this.prisma.projectMember.createMany({
        data: newMemberIds.map(
          (managerId) => ({
            projectId,
            userId: managerId,
            roleId: projectManagerRole.id,
          }),
        ),
      });
    }

    // Return all project managers
    return this.prisma.projectMember.findMany({
      where: {
        projectId,

        role: {
          name: 'PROJECT_MANAGER',
        },
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

        role: {
          select: {
            id: true,
            name: true,
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

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'User is inactive',
      );
    }

    if (user.id === project.createdBy) {
      throw new ConflictException(
        'Project manager is already the project owner',
      );
    }

    // Validate role
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

    // Prevent using ADMIN role as project role
    if (role.name === 'ADMIN') {
      throw new ForbiddenException(
        'ADMIN role cannot be assigned as a project role',
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
        roleId: dto.roleId,
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

        role: {
          select: {
            id: true,
            name: true,
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

        include: {
          role: true,
        },
      });

    if (!member) {
      throw new NotFoundException(
        'User is not a member of this project',
      );
    }

    // Project creator should not be removed
    if (member.userId === project.createdBy) {
      throw new ForbiddenException(
        'Project owner cannot be removed from the project',
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