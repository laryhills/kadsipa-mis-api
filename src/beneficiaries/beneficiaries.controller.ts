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
} from '@nestjs/common';
import { BeneficiariesService } from './beneficiaries.service';
import { CreateBeneficiaryDtoArray } from './dto/create-beneficiary.dto';
import { UpdateBeneficiaryDto } from './dto/update-beneficiary.dto';
import { PassportJwtGuard } from '@/auth/guards/passport-jwt.guard';
import { createdResponse, successResponse } from '@/common';
import { RequirePermission } from '@/auth/decorators/require-permission.decorator';
import { QueryBeneficiariesDto } from './dto/query-beneficiaries.dto';
import { Audit } from '@/audit/decorators/audit.decorator';
import { ActivityType } from '@/audit/constants/audit-action.enum';

@Controller({ version: '1', path: 'beneficiaries' })
@UseGuards(PassportJwtGuard)
export class BeneficiariesController {
  constructor(private readonly beneficiariesService: BeneficiariesService) {}

  @Post()
  @Audit(ActivityType.BENEFICIARY, 'Beneficiaries created (bulk)')
  async create(@Body() createBeneficiaryDtoArray: CreateBeneficiaryDtoArray) {
    const beneficiaries = await this.beneficiariesService.create(
      createBeneficiaryDtoArray.beneficiaries,
    );
    return createdResponse('Beneficiaries created successfully', beneficiaries);
  }

  @Get()
  @RequirePermission('interventions.viewInterventions')
  async findAll(@Query() query: QueryBeneficiariesDto) {
    const beneficiaries = await this.beneficiariesService.findAll(query);
    return successResponse('Beneficiaries fetched successfully', beneficiaries);
  }

  @Get(':id')
  @RequirePermission('interventions.viewInterventions')
  async findOne(@Param('id') id: string) {
    const beneficiary = await this.beneficiariesService.findOne(id);
    return successResponse('Beneficiary fetched successfully', beneficiary);
  }

  @Patch(':id')
  @Audit(ActivityType.BENEFICIARY, 'Beneficiary updated')
  async update(
    @Param('id') id: string,
    @Body() updateBeneficiaryDto: UpdateBeneficiaryDto,
  ) {
    const beneficiary = await this.beneficiariesService.update(
      id,
      updateBeneficiaryDto,
    );
    return successResponse('Beneficiary updated successfully', beneficiary);
  }

  @Delete(':id')
  @Audit(ActivityType.BENEFICIARY, 'Beneficiary deleted')
  async remove(@Param('id') id: string) {
    await this.beneficiariesService.remove(id);
    return successResponse('Beneficiary deleted successfully', null);
  }

  @Post(':id/restore')
  @Audit(ActivityType.BENEFICIARY, 'Beneficiary restored')
  async restore(@Param('id') id: string) {
    const beneficiary = await this.beneficiariesService.restore(id);
    return successResponse('Beneficiary restored successfully', beneficiary);
  }
}
