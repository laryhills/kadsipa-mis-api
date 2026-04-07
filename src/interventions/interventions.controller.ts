import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { InterventionsService } from './interventions.service';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { UpdateInterventionDto } from './dto/update-intervention.dto';
import { PassportJwtGuard } from '../auth/guards/passport-jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { createdResponse, successResponse } from '../common';
import { UploadNotificationsService } from '../notifications/upload-notifications.service';

@Controller('interventions')
@UseGuards(PassportJwtGuard, RolesGuard)
export class InterventionsController {
  constructor(
    private readonly interventionsService: InterventionsService,
    private readonly uploadNotificationsService: UploadNotificationsService,
  ) {}

  @Post()
  @RequirePermission('interventions.manageInterventions')
  async create(@Body() createInterventionDto: CreateInterventionDto) {
    const result =
      await this.interventionsService.create(createInterventionDto);
    return createdResponse('Intervention created successfully', result);
  }

  @Get()
  @RequirePermission('interventions.viewInterventions')
  async findAll() {
    const result = await this.interventionsService.findAll();
    return successResponse('Interventions fetched successfully', result);
  }

  @Get(':id')
  @RequirePermission('interventions.viewInterventions')
  async findOne(@Param('id') id: string) {
    const result = await this.interventionsService.findOne(id);
    return successResponse('Intervention fetched successfully', result);
  }

  @Get(':id/form-schema')
  @RequirePermission('interventions.viewInterventions')
  async getFormSchema(@Param('id') id: string) {
    const result = await this.interventionsService.getFormSchema(id);
    return successResponse('Form schema fetched successfully', result);
  }

  @Get(':id/notifications')
  @RequirePermission('interventions.viewInterventions')
  async getNotifications(@Param('id') id: string) {
    const result =
      await this.uploadNotificationsService.findByIntervention(id);
    return successResponse('Notifications fetched successfully', result);
  }

  @Patch(':id')
  @RequirePermission('interventions.manageInterventions')
  async update(
    @Param('id') id: string,
    @Body() updateInterventionDto: UpdateInterventionDto,
  ) {
    const result = await this.interventionsService.update(
      id,
      updateInterventionDto,
    );
    return successResponse('Intervention updated successfully', result);
  }

  @Delete(':id')
  @RequirePermission('interventions.manageInterventions')
  async remove(@Param('id') id: string) {
    const result = await this.interventionsService.remove(id);
    return successResponse('Intervention deleted successfully', result);
  }
}
