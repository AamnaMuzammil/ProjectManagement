import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

import { PermissionsGuard } from '../common/guards/permissions.guard';

import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
  ],

  controllers: [
    TasksController,
  ],

  providers: [
    TasksService,
    PermissionsGuard,
  ],
})
export class TasksModule {}