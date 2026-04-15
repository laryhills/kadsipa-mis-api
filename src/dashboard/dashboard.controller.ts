import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PassportJwtGuard } from '../auth/guards/passport-jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { successResponse } from '../common/response.helper';
import { DashboardService } from './dashboard.service';
import {
  BeneficiaryGrowthPeriod,
  BeneficiaryGrowthQueryDto,
} from './dto/dashboard-queries.dto';

@Controller({ version: '1', path: 'dashboard' })
@UseGuards(PassportJwtGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @RequirePermission('reports.viewReports')
  async overview() {
    const data = await this.dashboardService.getOverview();
    return successResponse('Dashboard overview fetched successfully', data);
  }

  @Get('interventions/top')
  @RequirePermission('reports.viewReports')
  async topInterventions(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const clamped = Math.min(50, Math.max(1, limit));
    const data = await this.dashboardService.getTopInterventions({
      limit: clamped,
    });
    return successResponse('Top interventions fetched successfully', data);
  }

  @Get('beneficiaries/growth')
  @RequirePermission('reports.viewReports')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async beneficiaryGrowth(@Query() query: BeneficiaryGrowthQueryDto) {
    const data = await this.dashboardService.getBeneficiaryGrowth(
      query.period ?? BeneficiaryGrowthPeriod.MONTHLY,
    );
    return successResponse(
      'Beneficiary growth trends fetched successfully',
      data,
    );
  }

  @Get('budget/utilization')
  @RequirePermission('reports.viewReports')
  async budgetUtilization() {
    const data = await this.dashboardService.getBudgetUtilization();
    return successResponse('Budget utilization fetched successfully', data);
  }

  @Get('budget/categories')
  @RequirePermission('reports.viewReports')
  async budgetCategories() {
    const data = await this.dashboardService.getBudgetCategories();
    return successResponse(
      'Budget categories summary fetched successfully',
      data,
    );
  }

  @Get('disbursements/recent')
  @RequirePermission('reports.viewReports')
  async recentDisbursements(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const clamped = Math.min(100, Math.max(1, limit));
    const data = await this.dashboardService.getRecentDisbursements({
      limit: clamped,
    });
    return successResponse('Recent disbursements fetched successfully', data);
  }

  @Get('lgas/top-performers')
  @RequirePermission('reports.viewReports')
  async topLgas(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const clamped = Math.min(50, Math.max(1, limit));
    const data = await this.dashboardService.getTopLgas({ limit: clamped });
    return successResponse('Top LGAs fetched successfully', data);
  }
}
