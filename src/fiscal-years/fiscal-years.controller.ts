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
} from '@nestjs/common';
import { FiscalYearsService } from './fiscal-years.service';
import { CreateFiscalYearDto } from './dto/create-fiscal-year.dto';
import { UpdateFiscalYearDto } from './dto/update-fiscal-year.dto';
import { PassportJwtGuard } from '../auth/guards/passport-jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { createdResponse, successResponse } from '../common';

@Controller('fiscal-years')
@UseGuards(PassportJwtGuard, RolesGuard)
export class FiscalYearsController {
  constructor(private readonly fiscalYearsService: FiscalYearsService) {}

  @Post()
  @RequirePermission('financialManagement.manageBudget')
  async create(@Body() createDto: CreateFiscalYearDto) {
    const fiscalYear = await this.fiscalYearsService.create(createDto);
    return createdResponse('Fiscal year created successfully', fiscalYear);
  }

  @Get()
  @RequirePermission('financialManagement.viewBudget')
  async findAll() {
    const fiscalYears = await this.fiscalYearsService.findAll();
    return successResponse('Fiscal years fetched successfully', fiscalYears);
  }

  @Get('active')
  @RequirePermission('financialManagement.viewBudget')
  async findActive() {
    const fiscalYears = await this.fiscalYearsService.findActive();
    return successResponse(
      'Active fiscal years fetched successfully',
      fiscalYears,
    );
  }

  @Get(':id')
  @RequirePermission('financialManagement.viewBudget')
  async findOne(@Param('id') id: string) {
    const fiscalYear = await this.fiscalYearsService.findOne(id);
    return successResponse('Fiscal year fetched successfully', fiscalYear);
  }

  @Patch(':id')
  @RequirePermission('financialManagement.manageBudget')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateFiscalYearDto,
  ) {
    const fiscalYear = await this.fiscalYearsService.update(id, updateDto);
    return successResponse('Fiscal year updated successfully', fiscalYear);
  }

  @Delete(':id')
  @RequirePermission('financialManagement.manageBudget')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.fiscalYearsService.remove(id);
  }
}
