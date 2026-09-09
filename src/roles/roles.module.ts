import { Module } from '@nestjs/common';

import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
  ],

  controllers: [
    RolesController,
  ],

  providers: [
    RolesService,
  ],
})
export class RolesModule {}