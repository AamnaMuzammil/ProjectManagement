import { Module } from '@nestjs/common';

import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
  ],

  controllers: [
    PermissionsController,
  ],

  providers: [
    PermissionsService,
  ],
})
export class PermissionsModule {}