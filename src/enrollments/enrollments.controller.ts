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
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { PassportJwtGuard } from '@/auth/guards/passport-jwt.guard';
import { createdResponse, successResponse } from '@/common';

@Controller({ version: '1', path: 'enrollments' })
@UseGuards(PassportJwtGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  async create(@Body() createEnrollmentDto: CreateEnrollmentDto) {
    const enrollment =
      await this.enrollmentsService.create(createEnrollmentDto);
    return createdResponse('Enrollment created successfully', enrollment);
  }

  @Get()
  async findAll(
    @Query('interventionId') interventionId?: string,
    @Query('beneficiaryId') beneficiaryId?: string,
  ) {
    if (interventionId) {
      const enrollments =
        await this.enrollmentsService.findByIntervention(interventionId);
      return successResponse('Enrollments fetched successfully', enrollments);
    }

    if (beneficiaryId) {
      const enrollments =
        await this.enrollmentsService.findByBeneficiary(beneficiaryId);
      return successResponse('Enrollments fetched successfully', enrollments);
    }

    const enrollments = await this.enrollmentsService.findAll();
    return successResponse('Enrollments fetched successfully', enrollments);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const enrollment = await this.enrollmentsService.findOne(id);
    return successResponse('Enrollment fetched successfully', enrollment);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateEnrollmentDto: UpdateEnrollmentDto,
  ) {
    const enrollment = await this.enrollmentsService.update(
      id,
      updateEnrollmentDto,
    );
    return successResponse('Enrollment updated successfully', enrollment);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.enrollmentsService.remove(id);
    return successResponse('Enrollment deleted successfully', null);
  }
}
