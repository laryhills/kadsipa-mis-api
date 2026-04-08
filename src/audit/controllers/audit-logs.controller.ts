import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { AuditLogsService } from '../services/audit-logs.service';
import { QueryAuditLogDto } from '../dto/query-audit-log.dto';
import { PassportJwtGuard } from '@/auth/guards/passport-jwt.guard';
import { successResponse } from '@/common';

@Controller({ version: '1', path: 'audit-logs' })
@UseGuards(PassportJwtGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  async findAll(@Query() query: QueryAuditLogDto) {
    const result = await this.auditLogsService.findAll(query);
    return successResponse('Audit logs retrieved successfully', result);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const auditLog = await this.auditLogsService.findOne(id);
    return successResponse('Audit log retrieved successfully', auditLog);
  }

  @Get('resource/:resourceType/:resourceId')
  async findByResource(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    const auditLogs = await this.auditLogsService.findByResourceId(
      resourceType,
      resourceId,
    );
    return successResponse(
      'Resource audit logs retrieved successfully',
      auditLogs,
    );
  }

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    const auditLogs = await this.auditLogsService.findByUserId(userId);
    return successResponse('User audit logs retrieved successfully', auditLogs);
  }
}
