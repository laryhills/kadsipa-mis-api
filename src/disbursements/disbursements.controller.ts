import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DisbursementsService } from './disbursements.service';
/* import { CreateDisbursementDto } from './dto/create-disbursement.dto'; */
import { CreateBatchDisbursementDto } from './dto/create-batch-disbursement.dto';
import { UpdateDisbursementStatusDto } from './dto/update-disbursement-status.dto';
import { PassportJwtGuard } from '../auth/guards/passport-jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { DisbursementStatus } from './entities/disbursement.entity';
import { createdResponse, successResponse } from '../common';
import { Audit } from '../audit/decorators/audit.decorator';
import { ActivityType } from '../audit/constants/audit-action.enum';

@Controller({ version: '1', path: 'disbursements' })
@UseGuards(PassportJwtGuard, RolesGuard)
export class DisbursementsController {
  constructor(private readonly disbursementsService: DisbursementsService) {}

  /*   @Post()
  @RequirePermission('financialManagement.manageBudget')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDisbursementDto: CreateDisbursementDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const disbursement = await this.disbursementsService.create(
      createDisbursementDto,
      currentUser.id,
    );
    return createdResponse('Disbursement created successfully', disbursement);
  } */

  @Post()
  @RequirePermission('financialManagement.manageBudget')
  @HttpCode(HttpStatus.CREATED)
  @Audit(ActivityType.DISBURSEMENT, 'Disbursement batch created')
  async createBatch(
    @Body() createBatchDto: CreateBatchDisbursementDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const disbursements = await this.disbursementsService.createBatch(
      createBatchDto,
      currentUser.id,
    );
    return createdResponse(
      `Batch of ${disbursements.length} disbursements created successfully`,
      {
        batchNumber: disbursements[0]?.batchNumber,
        count: disbursements.length,
        disbursements,
      },
    );
  }

  @Get()
  @RequirePermission('financialManagement.viewBudget')
  async findAll(
    @Query('status') status?: DisbursementStatus,
    @Query('interventionId') interventionId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: Record<string, unknown> = {};
    if (status) filters.status = status;
    if (interventionId) filters.interventionId = interventionId;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const disbursements = await this.disbursementsService.findAll(filters);
    return successResponse('Disbursements fetched successfully', disbursements);
  }

  @Get('recent')
  @RequirePermission('financialManagement.viewBudget')
  async getRecent(@Query('limit') limit?: string) {
    const disbursements = await this.disbursementsService.getRecent(
      limit ? parseInt(limit) : 10,
    );
    return successResponse(
      'Recent disbursements fetched successfully',
      disbursements,
    );
  }

  @Get('by-intervention')
  @RequirePermission('financialManagement.viewBudget')
  async getByIntervention() {
    const summary = await this.disbursementsService.getByIntervention();
    return successResponse(
      'Disbursement totals by intervention fetched successfully',
      summary,
    );
  }

  @Get(':id')
  @RequirePermission('financialManagement.viewBudget')
  async findOne(@Param('id') id: string) {
    const disbursement = await this.disbursementsService.findOne(id);
    return successResponse('Disbursement fetched successfully', disbursement);
  }

  @Patch(':id/status')
  @RequirePermission('financialManagement.manageBudget')
  @Audit(ActivityType.DISBURSEMENT, 'Disbursement status updated')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateDisbursementStatusDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const disbursement = await this.disbursementsService.updateStatus(
      id,
      updateStatusDto,
      currentUser.id,
    );
    return successResponse(
      'Disbursement status updated successfully',
      disbursement,
    );
  }
}
