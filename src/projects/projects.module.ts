import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

import { PermissionsGuard } from '../common/guards/permissions.guard';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
  ],

  controllers: [
    ProjectsController,
  ],

  providers: [
    ProjectsService,
    PermissionsGuard,
  ],
})
export class ProjectsModule {}