import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogEntity } from './entities/audit-log.entity';
import { ActivityLogEntity } from './entities/activity-log.entity';
import { AuditLogsService } from './services/audit-logs.service';
import { ActivityLogsService } from './services/activity-logs.service';
import { AuditLogsController } from './controllers/audit-logs.controller';
import { ActivityLogsController } from './controllers/activity-logs.controller';
import { AuditSubscriber } from './subscribers/audit.subscriber';
import { AuditInterceptor } from './interceptors/audit.interceptor';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity, ActivityLogEntity])],
  controllers: [AuditLogsController, ActivityLogsController],
  providers: [
    AuditLogsService,
    ActivityLogsService,
    AuditSubscriber,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [AuditLogsService, ActivityLogsService],
})
export class AuditModule {}
