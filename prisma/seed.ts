import 'dotenv/config';

import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import * as argon2 from 'argon2';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be defined in .env');
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  // =========================
  // ROLES
  // =========================

  const roles = [
    'ADMIN',
    'PROJECT_MANAGER',
    'DEVELOPER',
    'DESIGNER',
    'TESTER',
    'DEPLOYER',
    'FRONTEND',
    'BACKEND',
  ];

  // =========================
  // PERMISSIONS
  // =========================

  const permissions = [
    'VIEW_USER',
    'CREATE_USER',
    'UPDATE_USER',
    'DELETE_USER',

    'ACTIVATE_USER',
    'DEACTIVATE_USER',

    'ASSIGN_ROLE',
    'ASSIGN_PERMISSION',

    'VIEW_EMPLOYEE',
    'CREATE_EMPLOYEE',
    'UPDATE_EMPLOYEE',
    'DELETE_EMPLOYEE',

    'VIEW_PROJECT',
    'CREATE_PROJECT',
    'UPDATE_PROJECT',
    'DELETE_PROJECT',

    'VIEW_TASK',
    'CREATE_TASK',
    'UPDATE_TASK',
    'DELETE_TASK',
    'ASSIGN_TASK',

    'VIEW_PROJECT_MEMBER',
    'ADD_PROJECT_MEMBER',
    'REMOVE_PROJECT_MEMBER',
    'CREATE_SUBTASK',
    'UPDATE_SUBTASK',
    'DELETE_SUBTASK',
  ];

  // =========================
  // SEED ROLES
  // =========================

  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // =========================
  // SEED PERMISSIONS
  // =========================

  for (const name of permissions) {
    await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // =========================
  // GET ADMIN ROLE
  // =========================

  const adminRole = await prisma.role.findUnique({
    where: {
      name: 'ADMIN',
    },
  });

  if (!adminRole) {
    throw new Error('ADMIN role not found');
  }

  // =========================
  // GIVE ADMIN ALL PERMISSIONS
  // =========================

  const allPermissions = await prisma.permission.findMany();

  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },

      update: {},

      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }

    // =========================
  // GIVE PROJECT MANAGER
  // PROJECT & TASK PERMISSIONS
  // =========================

  const projectManagerRole =
    await prisma.role.findUnique({
      where: {
        name: 'PROJECT_MANAGER',
      },
    });

  if (!projectManagerRole) {
    throw new Error(
      'PROJECT_MANAGER role not found',
    );
  }

  const projectManagerPermissions = [
    'VIEW_PROJECT',
    'CREATE_PROJECT',
    'UPDATE_PROJECT',
    'DELETE_PROJECT',

    'VIEW_PROJECT_MEMBER',
    'ADD_PROJECT_MEMBER',
    'REMOVE_PROJECT_MEMBER',

    'VIEW_TASK',
    'CREATE_TASK',
    'UPDATE_TASK',
    'DELETE_TASK',
    'ASSIGN_TASK',

    'CREATE_SUBTASK',
    'UPDATE_SUBTASK',
    'DELETE_SUBTASK',
  ];

  for (
    const permissionName of projectManagerPermissions
  ) {
    const permission =
      await prisma.permission.findUnique({
        where: {
          name: permissionName,
        },
      });

    if (!permission) {
      throw new Error(
        `Permission ${permissionName} not found`,
      );
    }

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: projectManagerRole.id,
          permissionId: permission.id,
        },
      },

      update: {},

      create: {
        roleId: projectManagerRole.id,
        permissionId: permission.id,
      },
    });
  }

  console.log(
    'PROJECT_MANAGER project/task permissions assigned successfully',
  );

  // =========================
  // CREATE / FIND ADMIN USER
  // =========================

  const hashedPassword = await argon2.hash(adminPassword);

  const adminUser = await prisma.user.upsert({
    where: {
      email: adminEmail,
    },

    update: {
      // Password seed ke time update ho jayega
      password: hashedPassword,
      status: 'ACTIVE',
    },

    create: {
      name: 'System Admin',
      email: adminEmail,
      password: hashedPassword,
      status: 'ACTIVE',
    },
  });

  // =========================
  // ASSIGN ADMIN ROLE
  // =========================

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },

    update: {},

    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  console.log('Roles seeded successfully');

  console.log('Permissions seeded successfully');

  console.log('ADMIN permissions assigned successfully');

  console.log(`ADMIN user ready: ${adminEmail}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
