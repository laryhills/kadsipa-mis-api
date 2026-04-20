import { Module, Global, OnModuleInit } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { ActivityLog, ActivityLogSchema } from './schemas/activity-log.schema';
import { AuditLogsService } from './services/audit-logs.service';
import { ActivityLogsService } from './services/activity-logs.service';
import { AuditLogsController } from './controllers/audit-logs.controller';
import { ActivityLogsController } from './controllers/activity-logs.controller';
import { AuditSubscriber } from './subscribers/audit.subscriber';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';

@Global()
@Module({
  imports: [
    AuthModule,
    RolesModule,
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: ActivityLog.name, schema: ActivityLogSchema },
    ]),
  ],
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
export class AuditModule implements OnModuleInit {
  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLog>,
    private auditSubscriber: AuditSubscriber,
  ) {}

  onModuleInit() {
    this.auditSubscriber.setAuditLogModel(this.auditLogModel);
  }
}
