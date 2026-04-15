import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardCacheService } from './dashboard-cache.service';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    CacheModule.register({
      ttl: 120_000,
      max: 200,
    }),
    RolesModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardCacheService, DashboardService],
  exports: [DashboardCacheService],
})
export class DashboardModule {}
