import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ActivityLogsService } from '../services/activity-logs.service';
import { QueryActivityLogDto } from '../dto/query-activity-log.dto';
import { PassportJwtGuard } from '@/auth/guards/passport-jwt.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { RequirePermission } from '@/auth/decorators/require-permission.decorator';
import { successResponse } from '@/common';

const ROLE_PERMISSIONS_ACTIVITY_SEARCH = 'Role permissions updated';

@Controller({ version: '1', path: 'activity-logs' })
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  /** For permissions matrix footer; does not expose full activity history. */
  @Get('permissions-footer')
  @UseGuards(PassportJwtGuard, RolesGuard)
  @RequirePermission('userManagement.viewUsers')
  async permissionsFooter() {
    const result = await this.activityLogsService.findAll({
      page: 1,
      limit: 1,
      search: ROLE_PERMISSIONS_ACTIVITY_SEARCH,
    });
    return successResponse(
      'Latest permission change retrieved successfully',
      result.data[0] ?? null,
    );
  }

  @Get()
  @UseGuards(PassportJwtGuard, RolesGuard)
  @RequirePermission('auditLogs.viewAuditLogs')
  async findAll(@Query() query: QueryActivityLogDto) {
    const result = await this.activityLogsService.findAll(query);
    return successResponse('Activity logs retrieved successfully', result);
  }

  @Get('user/:userId')
  @UseGuards(PassportJwtGuard, RolesGuard)
  @RequirePermission('auditLogs.viewAuditLogs')
  async findByUser(@Param('userId') userId: string) {
    const activityLogs = await this.activityLogsService.findByUserId(userId);
    return successResponse(
      'User activity logs retrieved successfully',
      activityLogs,
    );
  }

  @Get(':id')
  @UseGuards(PassportJwtGuard, RolesGuard)
  @RequirePermission('auditLogs.viewAuditLogs')
  async findOne(@Param('id') id: string) {
    const activityLog = await this.activityLogsService.findOne(id);
    return successResponse('Activity log retrieved successfully', activityLog);
  }
}
