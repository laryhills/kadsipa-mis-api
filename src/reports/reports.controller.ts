import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  Res,
  Patch,
} from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { QueryReportsDto } from './dto/query-reports.dto';
import { PassportJwtGuard } from '../auth/guards/passport-jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { successResponse, createdResponse } from '../common';
import { AVAILABLE_METRICS } from './interfaces/report-metrics.interface';

@Controller({ version: '1', path: 'reports' })
@UseGuards(PassportJwtGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('metrics')
  @RequirePermission('reports.viewReports')
  getAvailableMetrics(@Query('reportType') reportType?: string) {
    if (reportType) {
      const filtered = AVAILABLE_METRICS.filter((metric) =>
        metric.applicableReportTypes.includes(reportType),
      );
      return successResponse(
        `Available metrics for ${reportType} fetched successfully`,
        filtered,
      );
    }
    return successResponse(
      'All available metrics fetched successfully',
      AVAILABLE_METRICS,
    );
  }

  @Post()
  @RequirePermission('reports.generateReports')
  async create(
    @Body() createReportDto: CreateReportDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const report = await this.reportsService.create(
      createReportDto,
      currentUser.id,
    );
    return createdResponse(
      'Report created successfully. Use the finalise endpoint to generate the report.',
      report,
    );
  }

  @Get()
  @RequirePermission('reports.viewReports')
  async findAll(@Query() query: QueryReportsDto) {
    const result = await this.reportsService.findAll(query);
    return successResponse('Reports fetched successfully', result);
  }

  @Get(':id')
  @RequirePermission('reports.viewReports')
  async findOne(@Param('id') id: string) {
    const report = await this.reportsService.findOne(id);
    return successResponse('Report fetched successfully', report);
  }

  @Get(':id/details')
  @RequirePermission('reports.viewReports')
  async getReportDetails(@Param('id') id: string) {
    const details = await this.reportsService.getReportDetails(id);
    return successResponse('Report details fetched successfully', details);
  }

  @Patch(':id')
  @RequirePermission('reports.generateReports')
  async update(
    @Param('id') id: string,
    @Body() updateReportDto: UpdateReportDto,
  ) {
    const report = await this.reportsService.update(id, updateReportDto);
    return successResponse('Report updated successfully', report);
  }

  @Post(':id/finalise')
  @RequirePermission('reports.generateReports')
  async finalise(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const report = await this.reportsService.finaliseReport(id, currentUser.id);
    return successResponse(
      'Report generation queued. Check status for completion.',
      report,
    );
  }

  @Post(':id/regenerate')
  @RequirePermission('reports.generateReports')
  async regenerate(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const report = await this.reportsService.regenerate(id, currentUser.id);
    return successResponse(
      'Report regeneration queued. Check status for completion.',
      report,
    );
  }

  @Get(':id/download/pdf')
  @RequirePermission('reports.viewReports')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const filePath = await this.reportsService.downloadFile(id, 'pdf');
    res.download(filePath);
  }

  @Get(':id/download/excel')
  @RequirePermission('reports.viewReports')
  async downloadExcel(@Param('id') id: string, @Res() res: Response) {
    const filePath = await this.reportsService.downloadFile(id, 'excel');
    res.download(filePath);
  }

  @Delete(':id')
  @RequirePermission('reports.deleteReports')
  async remove(@Param('id') id: string) {
    await this.reportsService.remove(id);
    return successResponse('Report deleted successfully', null);
  }
}
