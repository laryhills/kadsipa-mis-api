import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InterventionsService } from './interventions.service';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { UpdateInterventionDto } from './dto/update-intervention.dto';
import { PassportJwtGuard } from '../auth/guards/passport-jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { createdResponse, successResponse } from '../common';
import { UploadNotificationsService } from '../notifications/upload-notifications.service';
import { DataReviewService } from '../data-review/data-review.service';
import { BeneficiariesService } from '../beneficiaries/beneficiaries.service';
import { DisbursementsService } from '../disbursements/disbursements.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('interventions')
@UseGuards(PassportJwtGuard, RolesGuard)
export class InterventionsController {
  constructor(
    private readonly interventionsService: InterventionsService,
    private readonly uploadNotificationsService: UploadNotificationsService,
    private readonly dataReviewService: DataReviewService,
    private readonly beneficiariesService: BeneficiariesService,
    private readonly disbursementsService: DisbursementsService,
  ) {}

  @Post()
  @RequirePermission('interventions.createIntervention')
  async create(@Body() createInterventionDto: CreateInterventionDto) {
    const result = await this.interventionsService.create(
      createInterventionDto,
    );
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
    const result = await this.uploadNotificationsService.findByIntervention(id);
    return successResponse('Notifications fetched successfully', result);
  }

  @Get(':id/pending-beneficiaries')
  @RequirePermission('interventions.viewInterventions')
  async getPendingBeneficiaries(@Param('id') id: string) {
    const result = await this.dataReviewService.findAllInterventionPending(id);
    const intervention = await this.interventionsService.findOne(id);
    return successResponse('Pending beneficiaries fetched successfully', {
      beneficiaries: result,
      intervention: intervention,
    });
  }

  @Get(':id/beneficiaries')
  @RequirePermission('interventions.viewInterventions')
  async getBeneficiaries(
    @Param('id') id: string,
    @Query('includeDeleted') includeDeleted?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    await this.interventionsService.findOne(id);
    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const limitNum = limit ? Math.max(1, parseInt(limit, 10) || 10) : 10;
    const result = await this.beneficiariesService.findAllByIntervention(
      id,
      includeDeleted === 'true',
      limitNum,
      pageNum,
    );
    return successResponse('Beneficiaries fetched successfully', result);
  }

  @Post(':id/disburse')
  @RequirePermission('financialManagement.manageBudget')
  @HttpCode(HttpStatus.CREATED)
  async disburse(
    @Param('id') id: string,
    @Body() body: { referenceNumber?: string },
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const disbursements =
      await this.disbursementsService.createBatchForPendingEnrollments(
        id,
        currentUser.id,
        body?.referenceNumber || undefined,
      );
    return createdResponse(
      `Batch of ${disbursements.length} disbursements created for pending enrollments`,
      {
        batchNumber: disbursements[0]?.batchNumber,
        count: disbursements.length,
        disbursements,
      },
    );
  }

  @Patch(':id')
  @RequirePermission('interventions.editIntervention')
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
  @RequirePermission('interventions.editIntervention')
  async remove(@Param('id') id: string) {
    const result = await this.interventionsService.remove(id);
    return successResponse('Intervention deleted successfully', result);
  }
}
