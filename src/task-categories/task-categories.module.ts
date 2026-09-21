import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

import { TaskCategoriesController } from './task-categories.controller';
import { TaskCategoriesService } from './task-categories.service';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
  ],

  controllers: [
    TaskCategoriesController,
  ],

  providers: [
    TaskCategoriesService,
  ],

  exports: [
    TaskCategoriesService,
  ],
})
export class TaskCategoriesModule {}