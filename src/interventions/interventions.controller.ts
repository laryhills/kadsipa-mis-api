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
import { QueryInterventionsDto } from './dto/query-interventions.dto';
import { QueryBeneficiariesDto } from '../beneficiaries/dto/query-beneficiaries.dto';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { Audit } from '../audit/decorators/audit.decorator';
import { ActivityType } from '../audit/constants/audit-action.enum';

@Controller({ version: '1', path: 'interventions' })
@UseGuards(PassportJwtGuard, RolesGuard)
export class InterventionsController {
  constructor(
    private readonly interventionsService: InterventionsService,
    private readonly uploadNotificationsService: UploadNotificationsService,
    private readonly dataReviewService: DataReviewService,
    private readonly beneficiariesService: BeneficiariesService,
    private readonly disbursementsService: DisbursementsService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  @Post()
  @RequirePermission('interventions.createIntervention')
  @Audit(ActivityType.INTERVENTION, 'Intervention created')
  async create(@Body() createInterventionDto: CreateInterventionDto) {
    const result = await this.interventionsService.create(
      createInterventionDto,
    );
    return createdResponse('Intervention created successfully', result);
  }

  @Get()
  @RequirePermission('interventions.viewInterventions')
  async findAll(@Query() query: QueryInterventionsDto) {
    const result = await this.interventionsService.findAll(query);
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
    @Query() query: QueryBeneficiariesDto,
  ) {
    await this.interventionsService.findOne(id);
    const result = await this.beneficiariesService.findAllByIntervention(
      id,
      query,
    );
    return successResponse('Beneficiaries fetched successfully', result);
  }

  @Post(':id/disburse')
  @RequirePermission('financialManagement.manageBudget')
  @HttpCode(HttpStatus.CREATED)
  @Audit(
    ActivityType.DISBURSEMENT,
    'Disbursement batch created for intervention pending enrollments',
  )
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

  @Delete(':id/beneficiaries/:beneficiaryId')
  @RequirePermission('interventions.editIntervention')
  @Audit(ActivityType.ENROLLMENT, 'Beneficiary removed from intervention')
  async removeBeneficiary(
    @Param('id') id: string,
    @Param('beneficiaryId') beneficiaryId: string,
  ) {
    await this.interventionsService.findOne(id);
    await this.enrollmentsService.removeByInterventionAndBeneficiary(
      id,
      beneficiaryId,
    );
    return successResponse('Beneficiary removed from intervention', null);
  }

  @Patch(':id')
  @RequirePermission('interventions.editIntervention')
  @Audit(ActivityType.INTERVENTION, 'Intervention updated')
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
  @Audit(ActivityType.INTERVENTION, 'Intervention deleted')
  async remove(@Param('id') id: string) {
    const result = await this.interventionsService.remove(id);
    return successResponse('Intervention deleted successfully', result);
  }
}
