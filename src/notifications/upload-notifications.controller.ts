import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PassportJwtGuard } from '../auth/guards/passport-jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UploadNotificationsService } from './upload-notifications.service';
import { successResponse } from '../common';

@Controller({ version: '1', path: 'notifications' })
@UseGuards(PassportJwtGuard, RolesGuard)
export class UploadNotificationsController {
  constructor(
    private readonly uploadNotificationsService: UploadNotificationsService,
  ) {}

  @Get()
  @RequirePermission('interventions.viewInterventions')
  async findAll(
    @CurrentUser() currentUser: JwtPayload,
    @Query('interventionId') interventionId?: string,
    @Query('status') status?: string,
  ) {
    const id = interventionId?.trim();
    const notifications = id
      ? await this.uploadNotificationsService.findByIntervention(id)
      : await this.uploadNotificationsService.findAll(currentUser.id, status);
    return successResponse('Notifications fetched successfully', notifications);
  }

  @Get('unread')
  @RequirePermission('interventions.viewInterventions')
  async countUnread(@CurrentUser() currentUser: JwtPayload) {
    const count = await this.uploadNotificationsService.countUnread(
      currentUser.id,
    );
    return successResponse('Unread count fetched successfully', { count });
  }

  @Patch(':id/read')
  @RequirePermission('interventions.viewInterventions')
  async markAsRead(@Param('id') id: string) {
    const notification = await this.uploadNotificationsService.markAsRead(id);
    return successResponse('Notification marked as read', notification);
  }

  @Patch('mark-all-read')
  @RequirePermission('interventions.viewInterventions')
  async markAllAsRead(@CurrentUser() currentUser: JwtPayload) {
    await this.uploadNotificationsService.markAllAsRead(currentUser.id);
    return successResponse('All notifications marked as read', null);
  }

  @Delete(':id')
  @RequirePermission('interventions.manageInterventions')
  async remove(@Param('id') id: string) {
    await this.uploadNotificationsService.remove(id);
    return successResponse('Notification deleted successfully', null);
  }
}
