import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { FundRequestsService } from './fund-requests.service';
import { CreateFundRequestDto } from './dto/create-fund-request.dto';
import { UpdateFundRequestDto } from './dto/update-fund-request.dto';
import { ApproveFundRequestDto } from './dto/approve-fund-request.dto';
import { RejectFundRequestDto } from './dto/reject-fund-request.dto';
import { PassportJwtGuard } from '../auth/guards/passport-jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { createdResponse, successResponse } from '../common';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Audit } from '../audit/decorators/audit.decorator';
import { ActivityType } from '../audit/constants/audit-action.enum';

@Controller({ version: '1', path: 'finance/fund-requests' })
@UseGuards(PassportJwtGuard, RolesGuard)
export class FundRequestsController {
  constructor(private readonly fundRequestsService: FundRequestsService) {}

  @Post()
  @RequirePermission('financialManagement.manageBudget')
  @Audit(ActivityType.FUND_REQUEST, 'Fund request created')
  async create(
    @Body() createDto: CreateFundRequestDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const fundRequest = await this.fundRequestsService.create(
      createDto,
      currentUser.id,
    );
    return createdResponse('Fund request created successfully', fundRequest);
  }

  @Get()
  @RequirePermission('financialManagement.viewBudget')
  async findAll(@Query('fiscalYearId') fiscalYearId?: string) {
    const fundRequests = await this.fundRequestsService.findAll(fiscalYearId);
    return successResponse('Fund requests fetched successfully', fundRequests);
  }

  @Get('pending')
  @RequirePermission('financialManagement.viewBudget')
  async findPending(@Query('fiscalYearId') fiscalYearId?: string) {
    const fundRequests =
      await this.fundRequestsService.findPending(fiscalYearId);
    return successResponse(
      'Pending fund requests fetched successfully',
      fundRequests,
    );
  }

  @Get('budget-line/:budgetLineId')
  @RequirePermission('financialManagement.viewBudget')
  async findByBudgetLine(@Param('budgetLineId') budgetLineId: string) {
    const fundRequests =
      await this.fundRequestsService.findByBudgetLine(budgetLineId);
    return successResponse(
      'Fund requests for budget line fetched successfully',
      fundRequests,
    );
  }

  @Get('intervention/:interventionId')
  @RequirePermission('financialManagement.viewBudget')
  async findByIntervention(@Param('interventionId') interventionId: string) {
    const fundRequests =
      await this.fundRequestsService.findByIntervention(interventionId);
    return successResponse(
      'Fund requests for intervention fetched successfully',
      fundRequests,
    );
  }

  @Get(':id')
  @RequirePermission('financialManagement.viewBudget')
  async findOne(@Param('id') id: string) {
    const fundRequest = await this.fundRequestsService.findOne(id);
    return successResponse('Fund request fetched successfully', fundRequest);
  }

  @Patch(':id')
  @RequirePermission('financialManagement.manageBudget')
  @Audit(ActivityType.FUND_REQUEST, 'Fund request updated')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateFundRequestDto,
  ) {
    const fundRequest = await this.fundRequestsService.update(id, updateDto);
    return successResponse('Fund request updated successfully', fundRequest);
  }

  @Patch(':id/approve')
  @RequirePermission('financialManagement.approveDisbursements')
  async approve(
    @Param('id') id: string,
    @Body() approveDto: ApproveFundRequestDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const fundRequest = await this.fundRequestsService.approve(
      id,
      approveDto,
      currentUser.id,
    );
    return successResponse('Fund request approved successfully', fundRequest);
  }

  @Patch(':id/reject')
  @RequirePermission('financialManagement.approveDisbursements')
  async reject(
    @Param('id') id: string,
    @Body() rejectDto: RejectFundRequestDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const fundRequest = await this.fundRequestsService.reject(
      id,
      rejectDto,
      currentUser.id,
    );
    return successResponse('Fund request rejected successfully', fundRequest);
  }

  @Delete(':id')
  @RequirePermission('financialManagement.manageBudget')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.fundRequestsService.remove(id);
  }
}
