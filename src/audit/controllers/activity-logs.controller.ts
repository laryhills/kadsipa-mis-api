import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ActivityLogsService } from '../services/activity-logs.service';
import { QueryActivityLogDto } from '../dto/query-activity-log.dto';
import { PassportJwtGuard } from '@/auth/guards/passport-jwt.guard';
import { successResponse } from '@/common';

@Controller('activity-logs')
@UseGuards(PassportJwtGuard)
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Get()
  async findAll(@Query() query: QueryActivityLogDto) {
    const result = await this.activityLogsService.findAll(query);
    return successResponse('Activity logs retrieved successfully', result);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const activityLog = await this.activityLogsService.findOne(id);
    return successResponse('Activity log retrieved successfully', activityLog);
  }

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    const activityLogs = await this.activityLogsService.findByUserId(userId);
    return successResponse(
      'User activity logs retrieved successfully',
      activityLogs,
    );
  }
}
